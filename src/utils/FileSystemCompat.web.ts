class WebDirectory {
  uri: string;

  constructor(...parts: unknown[]) {
    this.uri = parts.map((part) => String((part as { uri?: string })?.uri ?? part)).join('/');
  }

  create() {
    return undefined;
  }
}

class WebFile {
  uri: string;
  name: string;
  exists = false;

  constructor(...parts: unknown[]) {
    this.uri = parts.map((part) => String((part as { uri?: string })?.uri ?? part)).join('/');
    this.name = this.uri.split('/').filter(Boolean).pop() || 'file';
  }

  copy() {
    throw new Error('Web 暂未启用本地文件复制');
  }

  delete() {
    return undefined;
  }
}

export const Directory = WebDirectory;
export const File = WebFile;
export const Paths = {
  document: 'web-document',
  cache: 'web-cache',
};
