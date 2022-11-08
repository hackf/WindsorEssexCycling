export function isLocalStorageAvailable() {
  try {
    const storageTest = '__storage_test__';
    window.localStorage.setItem(storageTest, storageTest);
    window.localStorage.removeItem(storageTest);
    return true;
  } catch (e) {
    console.warn('Your browser blocks access to localStorage');
    return false;
  }
}
