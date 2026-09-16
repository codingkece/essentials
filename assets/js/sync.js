const SUPABASE_URL = "https://kduoiwvxxisjsunrydst.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_gxSy-9zcyCIqbAtDkFoLnQ_tSzMIxTY";
const SUPABASE_TABLE = "favorites";

let supabaseClient = null;
let currentUser = null;
let isSyncing = false;
const authChangeListeners = [];
const crossTabListeners = [];

// ============================================================
// CROSS-TAB BROADCAST CHANNEL
// ============================================================
const tabChannel =
  typeof BroadcastChannel !== "undefined"
    ? new BroadcastChannel("diffuser_tab_sync")
    : null;

if (tabChannel) {
  tabChannel.onmessage = (event) => {
    if (event.data?.type === "FAVORITE_TOGGLED") {
      crossTabListeners.forEach((cb) => cb(event.data));
    }
  };
}

export function onCrossTabFavoriteUpdate(callback) {
  if (typeof callback === "function") {
    crossTabListeners.push(callback);
  }
}

export function broadcastFavoriteChange(recipeId, isSaved) {
  if (tabChannel) {
    tabChannel.postMessage({
      type: "FAVORITE_TOGGLED",
      recipeId: String(recipeId),
      isSaved: Boolean(isSaved),
    });
  }
}

// ============================================================
// DEXIE.JS LOCAL DATABASE (OFFLINE-FIRST STORAGE)
// ============================================================
let db = null;

export function initLocalDb() {
  if (db) return db;

  const DexieClass = window.Dexie;
  if (!DexieClass) {
    console.warn("Dexie is not available on window. Falling back to localStorage.");
    return null;
  }

  db = new DexieClass("DiffuserDB");
  db.version(1).stores({
    favorites: "id, updatedAt",
    syncQueue: "++queueId, recipeId, action, timestamp",
  });

  return db;
}

export async function loadSavedIdsFromLocal() {
  const database = initLocalDb();
  const legacySaved = JSON.parse(
    localStorage.getItem("diffuser_saved_ids") || "[]",
  );

  if (!database) {
    return new Set(legacySaved);
  }

  try {
    const count = await database.favorites.count();
    // Only migrate legacy if Dexie has never been populated
    if (count === 0 && legacySaved.length > 0 && !localStorage.getItem("diffuser_migrated")) {
      const initialItems = legacySaved.map((id) => ({
        id: String(id),
        updatedAt: Date.now(),
      }));
      await database.favorites.bulkPut(initialItems);
      localStorage.setItem("diffuser_migrated", "true");
    }

    const records = await database.favorites.toArray();
    const idSet = new Set(records.map((r) => String(r.id)));

    localStorage.setItem("diffuser_saved_ids", JSON.stringify(Array.from(idSet)));
    return idSet;
  } catch (err) {
    console.warn("Failed to load favorites from Dexie, using fallback:", err);
    return new Set(legacySaved);
  }
}

export async function persistFavoriteLocal(recipeId, isSaved) {
  const idStr = String(recipeId);
  const database = initLocalDb();

  if (database) {
    try {
      if (isSaved) {
        await database.favorites.put({ id: idStr, updatedAt: Date.now() });
      } else {
        await database.favorites.delete(idStr);
      }

      // Add operation to offline sync queue (replacing existing pending tasks for this item)
      await database.syncQueue
        .where("recipeId")
        .equals(idStr)
        .delete();

      await database.syncQueue.add({
        recipeId: idStr,
        action: isSaved ? "insert" : "delete",
        timestamp: Date.now(),
      });
    } catch (err) {
      console.warn("Dexie write error:", err);
    }
  }

  // Flush immediately without debounce to eliminate cross-tab race conditions
  if (navigator.onLine && currentUser) {
    flushQueue().catch((err) =>
      console.warn("Background sync error:", err)
    );
  }
}

// ============================================================
// SUPABASE CLIENT & AUTH
// ============================================================
export async function getSupabase() {
  if (supabaseClient) return supabaseClient;

  if (
    !SUPABASE_URL ||
    !SUPABASE_ANON_KEY ||
    !SUPABASE_URL.startsWith("http") ||
    typeof window.supabase === "undefined"
  ) {
    return null;
  }

  try {
    supabaseClient = window.supabase.createClient(
      SUPABASE_URL,
      SUPABASE_ANON_KEY,
    );

    const {
      data: { session },
    } = await supabaseClient.auth.getSession();
    currentUser = session?.user || null;

    supabaseClient.auth.onAuthStateChange((_event, session) => {
      currentUser = session?.user || null;
      authChangeListeners.forEach((cb) => cb(currentUser));
    });

    return supabaseClient;
  } catch (err) {
    console.warn("Could not initialize Supabase client:", err);
    return null;
  }
}

export function onAuthChange(callback) {
  if (typeof callback === "function") {
    authChangeListeners.push(callback);
  }
}

export function getCurrentUser() {
  return currentUser;
}

export async function signInWithEmail(email, password) {
  const client = await getSupabase();
  if (!client) {
    throw new Error(
      "Supabase client is not configured. Please set your Supabase URL & Key in sync.js.",
    );
  }

  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  currentUser = data.user;
  return data.user;
}

export async function signOutUser() {
  const client = await getSupabase();
  if (client) {
    try {
      await client.auth.signOut();
    } catch (err) {
      console.warn("Supabase sign out error:", err);
    }
  }
  currentUser = null;
}

// ============================================================
// SYNC ENGINE (DELETION-AWARE RECONCILIATION)
// ============================================================
export async function flushQueue() {
  if (!navigator.onLine || !currentUser) return;
  const client = await getSupabase();
  if (!client) return;

  const database = initLocalDb();
  if (!database) return;

  const queue = await database.syncQueue.toArray();
  if (queue.length === 0) return;

  const userId = currentUser.id;

  for (const item of queue) {
    try {
      if (item.action === "insert") {
        const { error } = await client
          .from(SUPABASE_TABLE)
          .upsert(
            { user_id: userId, recipe_id: item.recipeId },
            { onConflict: "user_id,recipe_id" },
          );
        if (error) throw error;
      } else if (item.action === "delete") {
        const { error } = await client
          .from(SUPABASE_TABLE)
          .delete()
          .eq("user_id", userId)
          .eq("recipe_id", item.recipeId);
        if (error) throw error;
      }

      await database.syncQueue.delete(item.queueId);
    } catch (err) {
      console.warn(`Supabase offline/sync failed for item ${item.recipeId}:`, err);
      break;
    }
  }
}

/**
 * Reconciles local and cloud favorites.
 * Respects deletions so un-favorited recipes never resurrect.
 */
export async function syncFavorites(currentLocalIds, onReconciled) {
  if (isSyncing || !navigator.onLine || !currentUser) return;
  isSyncing = true;

  try {
    const client = await getSupabase();
    if (!client) return;

    // 1. Process pending insertions and deletions first
    await flushQueue();

    const userId = currentUser.id;
    const { data: remoteItems, error } = await client
      .from(SUPABASE_TABLE)
      .select("recipe_id")
      .eq("user_id", userId);

    if (error) throw error;

    const database = initLocalDb();
    const pendingQueue = database ? await database.syncQueue.toArray() : [];
    const pendingInserts = new Set(
      pendingQueue.filter((q) => q.action === "insert").map((q) => String(q.recipeId)),
    );
    const pendingDeletes = new Set(
      pendingQueue.filter((q) => q.action === "delete").map((q) => String(q.recipeId)),
    );

    // 2. Build the reconciled set starting from remote source of truth
    const reconciledIds = new Set(
      (remoteItems || []).map((i) => String(i.recipe_id)),
    );

    // Any local item that failed to push due to offline stays inserted
    for (const id of pendingInserts) {
      reconciledIds.add(id);
    }

    // Any local item that is queued for deletion stays removed
    for (const id of pendingDeletes) {
      reconciledIds.delete(id);
    }

    // 3. Update local Dexie storage to match the reconciled set
    if (database) {
      await database.favorites.clear();
      const recordsToStore = Array.from(reconciledIds).map((id) => ({
        id,
        updatedAt: Date.now(),
      }));
      if (recordsToStore.length > 0) {
        await database.favorites.bulkPut(recordsToStore);
      }
    }

    // 4. Update localStorage backup
    localStorage.setItem(
      "diffuser_saved_ids",
      JSON.stringify(Array.from(reconciledIds)),
    );

    // 5. Always notify caller to update UI if state differed
    const setsAreEqual =
      currentLocalIds.size === reconciledIds.size &&
      Array.from(currentLocalIds).every((id) => reconciledIds.has(id));

    if (!setsAreEqual && typeof onReconciled === "function") {
      onReconciled(reconciledIds);
    }
  } catch (err) {
    console.warn("Supabase sync failed; local favorites preserved:", err);
  } finally {
    isSyncing = false;
  }
}