package com.ysclaude.app

import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream

class ShizukuFileUserService : IShizukuFileService.Stub() {
  override fun listDirectory(path: String): String {
    val directory = File(path)
    if (!directory.exists()) throw IllegalArgumentException("路径不存在: $path")
    if (!directory.isDirectory) throw IllegalArgumentException("路径不是目录: $path")

    val entries = directory.listFiles() ?: emptyArray()
    val builder = StringBuilder()
    builder.append("type\tname\tsize\tmodified\n")
    entries
      .sortedWith(compareBy<File> { !it.isDirectory }.thenBy { it.name.lowercase() })
      .forEach { file ->
        builder
          .append(if (file.isDirectory) "directory" else "file")
          .append('\t')
          .append(file.name.replace('\t', ' '))
          .append('\t')
          .append(if (file.isFile) file.length() else "")
          .append('\t')
          .append(file.lastModified())
          .append('\n')
      }
    return builder.toString()
  }

  override fun readFile(path: String, maxBytes: Int): String {
    val file = File(path)
    if (!file.exists()) throw IllegalArgumentException("文件不存在: $path")
    if (!file.isFile) throw IllegalArgumentException("路径不是文件: $path")

    val limit = maxBytes.coerceIn(1, MAX_READ_BYTES)
    val buffer = ByteArray(limit)
    val read = FileInputStream(file).use { input -> input.read(buffer) }
    if (read <= 0) return ""
    return buffer.copyOf(read).toString(Charsets.UTF_8)
  }

  override fun writeFile(path: String, content: String, append: Boolean, createParents: Boolean): String {
    val file = File(path)
    if (file.exists() && file.isDirectory) throw IllegalArgumentException("路径是目录，不能写入文件: $path")

    val parent = file.parentFile
    if (parent != null && !parent.exists()) {
      if (createParents) {
        if (!parent.mkdirs() && !parent.exists()) throw IllegalArgumentException("无法创建父目录: ${parent.absolutePath}")
      } else {
        throw IllegalArgumentException("父目录不存在: ${parent.absolutePath}")
      }
    }

    val bytes = content.toByteArray(Charsets.UTF_8)
    if (bytes.size > MAX_WRITE_BYTES) throw IllegalArgumentException("写入内容超过限制: ${bytes.size} > $MAX_WRITE_BYTES")

    FileOutputStream(file, append).use { output -> output.write(bytes) }
    return "ok\tpath=$path\tbytes=${bytes.size}\tappend=$append"
  }

  override fun replaceText(path: String, oldText: String, newText: String, replaceAll: Boolean): String {
    if (oldText.isEmpty()) throw IllegalArgumentException("oldText 不能为空")

    val file = File(path)
    if (!file.exists()) throw IllegalArgumentException("文件不存在: $path")
    if (!file.isFile) throw IllegalArgumentException("路径不是文件: $path")
    if (file.length() > MAX_MODIFY_BYTES) {
      throw IllegalArgumentException("文件超过修改限制: ${file.length()} > $MAX_MODIFY_BYTES")
    }

    val original = file.readText(Charsets.UTF_8)
    val count = if (replaceAll) {
      countOccurrences(original, oldText)
    } else if (original.contains(oldText)) {
      1
    } else {
      0
    }
    if (count == 0) throw IllegalArgumentException("未找到要替换的文本")

    val updated = if (replaceAll) {
      original.replace(oldText, newText)
    } else {
      original.replaceFirst(oldText, newText)
    }
    val updatedBytes = updated.toByteArray(Charsets.UTF_8)
    if (updatedBytes.size > MAX_WRITE_BYTES) throw IllegalArgumentException("修改后内容超过限制: ${updatedBytes.size} > $MAX_WRITE_BYTES")

    file.writeText(updated, Charsets.UTF_8)
    return "ok\tpath=$path\treplacements=$count\tbytes=${updatedBytes.size}"
  }

  override fun copyFile(sourcePath: String, targetPath: String, overwrite: Boolean, createParents: Boolean): String {
    val source = requireReadableSourceFile(sourcePath)
    if (source.canonicalPath == File(targetPath).canonicalPath) throw IllegalArgumentException("源文件和目标文件相同")
    val target = prepareTargetFile(targetPath, overwrite, createParents)

    FileInputStream(source).use { input ->
      FileOutputStream(target, false).use { output ->
        input.copyTo(output)
      }
    }

    return "ok\tsource=$sourcePath\ttarget=$targetPath\tbytes=${target.length()}\toverwrite=$overwrite"
  }

  override fun moveFile(sourcePath: String, targetPath: String, overwrite: Boolean, createParents: Boolean): String {
    val source = requireReadableSourceFile(sourcePath)
    if (source.canonicalPath == File(targetPath).canonicalPath) throw IllegalArgumentException("源文件和目标文件相同")
    val target = prepareTargetFile(targetPath, overwrite, createParents)
    val bytes = source.length()

    if (source.renameTo(target)) {
      return "ok\tsource=$sourcePath\ttarget=$targetPath\tbytes=$bytes\tmethod=rename\toverwrite=$overwrite"
    }

    FileInputStream(source).use { input ->
      FileOutputStream(target, false).use { output ->
        input.copyTo(output)
      }
    }

    if (!source.delete()) {
      target.delete()
      throw IllegalStateException("复制成功但无法删除源文件，已撤销目标文件: $sourcePath")
    }

    return "ok\tsource=$sourcePath\ttarget=$targetPath\tbytes=${target.length()}\tmethod=copy_delete\toverwrite=$overwrite"
  }

  private fun requireReadableSourceFile(path: String): File {
    val source = File(path)
    if (!source.exists()) throw IllegalArgumentException("源文件不存在: $path")
    if (!source.isFile) throw IllegalArgumentException("源路径不是文件: $path")
    return source
  }

  private fun prepareTargetFile(path: String, overwrite: Boolean, createParents: Boolean): File {
    val target = File(path)
    if (target.exists()) {
      if (target.isDirectory) throw IllegalArgumentException("目标路径是目录: $path")
      if (!overwrite) throw IllegalArgumentException("目标文件已存在，未启用覆盖: $path")
    }

    val parent = target.parentFile
    if (parent != null && !parent.exists()) {
      if (createParents) {
        if (!parent.mkdirs() && !parent.exists()) throw IllegalArgumentException("无法创建目标父目录: ${parent.absolutePath}")
      } else {
        throw IllegalArgumentException("目标父目录不存在: ${parent.absolutePath}")
      }
    }

    return target
  }

  private fun countOccurrences(text: String, needle: String): Int {
    var count = 0
    var start = 0
    while (true) {
      val index = text.indexOf(needle, start)
      if (index < 0) return count
      count += 1
      start = index + needle.length
    }
  }

  override fun destroy() {
    System.exit(0)
  }

  companion object {
    private const val MAX_READ_BYTES = 1024 * 1024
    private const val MAX_WRITE_BYTES = 1024 * 1024
    private const val MAX_MODIFY_BYTES = 1024 * 1024
  }
}
