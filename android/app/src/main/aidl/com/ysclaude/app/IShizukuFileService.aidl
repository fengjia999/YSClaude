package com.ysclaude.app;

interface IShizukuFileService {
  String listDirectory(String path);
  String readFile(String path, int maxBytes);
  String writeFile(String path, String content, boolean append, boolean createParents);
  String replaceText(String path, String oldText, String newText, boolean replaceAll);
  String copyFile(String sourcePath, String targetPath, boolean overwrite, boolean createParents);
  String moveFile(String sourcePath, String targetPath, boolean overwrite, boolean createParents);
  void destroy();
}
