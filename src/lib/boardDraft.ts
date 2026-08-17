export type BoardDraftData = {
  name: string;
  date: string;
  headline: string;
  intro: string;
  whatsapp: string;
  transferBankName: string;
  transferAccountNumber: string;
  transferAccountName: string;
  photos: File[];
  existingPhotoCount: number;
  items: { name: string; price: string; url: string }[];
  theme: string;
};

export type SavedBoardDraft = {
  draft: BoardDraftData;
  step: number;
  updatedAt: string;
};

const databaseName = "huraay-creation";
const storeName = "birthday-page-drafts";
const activeDraftKey = "active-birthday-page";

function openDraftDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    if (!("indexedDB" in window)) {
      reject(new Error("Draft storage is not supported in this browser"));
      return;
    }
    const request = indexedDB.open(databaseName, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(storeName)) {
        request.result.createObjectStore(storeName);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function transactDraftStore<T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>,
) {
  const database = await openDraftDatabase();
  return new Promise<T>((resolve, reject) => {
    const transaction = database.transaction(storeName, mode);
    const request = operation(transaction.objectStore(storeName));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => database.close();
    transaction.onerror = () => {
      database.close();
      reject(transaction.error);
    };
  });
}

export function loadBoardDraft() {
  return transactDraftStore<SavedBoardDraft | undefined>("readonly", (store) =>
    store.get(activeDraftKey),
  );
}

export function saveBoardDraft(draft: BoardDraftData, step: number) {
  const saved: SavedBoardDraft = {
    draft,
    step,
    updatedAt: new Date().toISOString(),
  };
  return transactDraftStore<IDBValidKey>("readwrite", (store) =>
    store.put(saved, activeDraftKey),
  );
}

export function clearBoardDraft() {
  return transactDraftStore<undefined>("readwrite", (store) =>
    store.delete(activeDraftKey),
  );
}
