self.addEventListener('fetch', event => {
    event.respondWith(handleRequest(event.request));
  });
  
  async function handleRequest(request) {
    const url = new URL(request.url);
    const isCached = await doesOPFSFileExist(url);
  
    if (isCached) {
      return serveFileFromOPFS(url);
    }
  
    try {
      const networkResponse = await fetch(request);
  
      // Clone the response before caching
      const responseClone = networkResponse.clone();
      cacheFileInOPFS(url, responseClone);
  
      return networkResponse;
    } catch (e) {
      return new Response("Network error and file not found in OPFS", { status: 504 });
    }
  }
  
  async function cacheFileInOPFS(url, response) {
    try {
      const pathParts = url.pathname.split("/").filter(part => part);
      const fileName = pathParts.pop();
      let currentDir = await navigator.storage.getDirectory();
  
      for (const part of pathParts) {
        currentDir = await currentDir.getDirectoryHandle(part, { create: true });
      }
  
      const fileHandle = await currentDir.getFileHandle(fileName, { create: true });
      const writableStream = await fileHandle.createWritable();
      await writableStream.write(await response.blob());
      await writableStream.close();
    } catch (e) {
      console.error("Error caching file in OPFS:", e);
    }
  }
  
  async function doesOPFSFileExist(url) {
    try {
      const pathParts = url.pathname.split("/").filter(part => part);
      const fileName = pathParts.pop();
      let currentDir = await navigator.storage.getDirectory();
  
      for (const part of pathParts) {
        currentDir = await currentDir.getDirectoryHandle(part, { create: false });
      }
  
      await currentDir.getFileHandle(fileName, { create: false });
      return true;
    } catch (e) {
      return false;
    }
  }
  
  async function serveFileFromOPFS(url) {
    try {
      const pathParts = url.pathname.split("/").filter(part => part);
      const fileName = pathParts.pop();
      let currentDir = await navigator.storage.getDirectory();
  
      for (const part of pathParts) {
        currentDir = await currentDir.getDirectoryHandle(part, { create: false });
      }
  
      const fileHandle = await currentDir.getFileHandle(fileName, { create: false });
      const file = await fileHandle.getFile();
      return new Response(file, { status: 200 });
    } catch (err) {
      return new Response("File not found in OPFS", { status: 404 });
    }
  }
  