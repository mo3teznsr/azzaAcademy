import 'package:dio/dio.dart';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart' show asMap;
import '../../../core/utils/json.dart';
import '../../checkout/domain/checkout_models.dart' show PickedFile;

/// A stored file on an assignment submission or a material: `{ url, name, size, type }`.
/// Uploads return it; submissions carry a list of them.
@immutable
class AttachedFile {
  const AttachedFile({required this.url, required this.name, required this.size, this.type = ''});

  factory AttachedFile.fromJson(Json j) =>
      AttachedFile(url: str(j, 'url'), name: str(j, 'name'), size: integer(j, 'size'), type: str(j, 'type'));

  final String url;
  final String name;
  final int size;
  final String type;

  Map<String, dynamic> toJson() => {'url': url, 'name': name, 'size': size, 'type': type};
}

/// What the API accepts for an upload (see docs/API.md, "Assignment & material files").
@immutable
class FileRule {
  const FileRule({required this.extensions, required this.maxBytes});
  final List<String> extensions;
  final int maxBytes;

  int get maxMb => maxBytes ~/ (1024 * 1024);

  /// The extensions shown to people ("PDF, DOCX, …"); `jpeg` is an alias of `jpg`.
  String get label => extensions.where((e) => e != 'jpeg').map((e) => e.toUpperCase()).join(', ');

  /// Why [file] would be refused, or null when it's fine to upload. Mirrors the server's reasons.
  FileRefusal? check(PickedFile file) {
    if (!extensions.contains(fileExtension(file.name))) return FileRefusal.type;
    if (file.size <= 0) return FileRefusal.empty;
    if (file.size > maxBytes) return FileRefusal.tooLarge;
    return null;
  }
}

enum FileRefusal { type, empty, tooLarge }

const _documentExtensions = ['pdf', 'docx', 'pptx', 'xlsx', 'png', 'jpg', 'jpeg', 'webp', 'zip', 'txt', 'md'];

/// `POST /assignments/:id/submission/file`: documents and images, at most 20 MB.
const submissionFileRule = FileRule(extensions: _documentExtensions, maxBytes: 20 * 1024 * 1024);

/// `POST /batches/:id/materials/file`: the same plus mp3/m4a, at most 50 MB. (No video: those still go through `/courses/media`.)
const materialFileRule = FileRule(extensions: [..._documentExtensions, 'mp3', 'm4a'], maxBytes: 50 * 1024 * 1024);

/// A submission holds at most this many files.
const maxSubmissionFiles = 5;

String fileExtension(String name) {
  final dot = name.lastIndexOf('.');
  return dot < 0 ? '' : name.substring(dot + 1).toLowerCase();
}

/// The multipart content type for a file name (the server also accepts the extension when this is missing).
DioMediaType? fileMediaType(String name) => switch (fileExtension(name)) {
      'pdf' => DioMediaType('application', 'pdf'),
      'docx' => DioMediaType('application', 'vnd.openxmlformats-officedocument.wordprocessingml.document'),
      'pptx' => DioMediaType('application', 'vnd.openxmlformats-officedocument.presentationml.presentation'),
      'xlsx' => DioMediaType('application', 'vnd.openxmlformats-officedocument.spreadsheetml.sheet'),
      'png' => DioMediaType('image', 'png'),
      'jpg' || 'jpeg' => DioMediaType('image', 'jpeg'),
      'webp' => DioMediaType('image', 'webp'),
      'zip' => DioMediaType('application', 'zip'),
      'txt' => DioMediaType('text', 'plain'),
      'md' => DioMediaType('text', 'markdown'),
      'mp3' => DioMediaType('audio', 'mpeg'),
      'm4a' => DioMediaType('audio', 'mp4'),
      _ => null,
    };

/// Uploads [file] as the multipart `file` field to [path] and returns the stored file.
Future<AttachedFile> uploadPickedFile(Dio dio, String path, PickedFile file, {void Function(double progress)? onProgress}) async {
  final type = fileMediaType(file.name);
  final form = FormData.fromMap({
    'file': file.path != null
        ? await MultipartFile.fromFile(file.path!, filename: file.name, contentType: type)
        : MultipartFile.fromBytes(file.bytes ?? const [], filename: file.name, contentType: type),
  });
  final res = await dio.post<dynamic>(
    path,
    data: form,
    onSendProgress: onProgress == null ? null : (sent, total) => onProgress(total <= 0 ? 0 : (sent / total).clamp(0, 1).toDouble()),
  );
  return AttachedFile.fromJson(asMap(res.data));
}

/// "2.4 MB", "320 KB" — Western digits in both languages.
String fileSizeLabel(int bytes) {
  const kb = 1024;
  const mb = 1024 * 1024;
  if (bytes >= mb) {
    final v = bytes / mb;
    return '${v >= 10 ? v.round() : v.toStringAsFixed(1)} MB';
  }
  if (bytes >= kb) return '${(bytes / kb).round()} KB';
  return '$bytes B';
}

// ───────────────────────── Document picker port ─────────────────────────

/// Picks documents from the device (tests swap it for a fake).
abstract class DocumentPicker {
  /// The chosen files, empty when the picker is dismissed.
  Future<List<PickedFile>> pick(List<String> extensions);
}

class PlatformDocumentPicker implements DocumentPicker {
  @override
  Future<List<PickedFile>> pick(List<String> extensions) async {
    final files = await FilePicker.pickFiles(type: FileType.custom, allowedExtensions: extensions);
    return [
      for (final f in files)
        PickedFile(
          name: f.name,
          size: f.lengthSync() ?? await f.length() ?? 0,
          path: f.path,
          bytes: f.path == null ? await f.readAsBytes() : null,
        ),
    ];
  }
}

final documentPickerProvider = Provider<DocumentPicker>((ref) => PlatformDocumentPicker());
