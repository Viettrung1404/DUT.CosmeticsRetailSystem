export const FILE_STORAGE = Symbol('IFileStorage');

export interface IFileStorage {
  // Trả về URL công khai của file vừa lưu
  upload(key: string, body: Buffer, contentType: string): Promise<string>;
}
