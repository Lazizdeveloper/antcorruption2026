import { randomUUID } from 'node:crypto';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { HttpError } from './httpError.js';

const UPLOAD_ROOT = path.resolve(process.cwd(), 'uploads');
const PROFILE_IMAGE_DIRECTORY = path.join(UPLOAD_ROOT, 'profile-images');
const APPLICATION_DOCUMENT_DIRECTORY = path.join(UPLOAD_ROOT, 'application-documents');
const MAX_PROFILE_IMAGE_SIZE_BYTES = 3 * 1024 * 1024;
const MAX_APPLICATION_DOCUMENT_SIZE_BYTES = 10 * 1024 * 1024;

const IMAGE_MIME_TYPE_TO_EXTENSION = new Map([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
  ['image/gif', '.gif'],
]);

const IMAGE_EXTENSION_TO_MIME_TYPE = new Map([
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.png', 'image/png'],
  ['.webp', 'image/webp'],
  ['.gif', 'image/gif'],
]);

const DOCUMENT_MIME_TYPE_TO_EXTENSION = new Map([
  ['application/pdf', '.pdf'],
]);

const DOCUMENT_EXTENSION_TO_MIME_TYPE = new Map([
  ['.pdf', 'application/pdf'],
]);

function resolveMimeType(mimeType, fileName, mimeTypeToExtension, extensionToMimeType) {
  const normalizedMimeType = String(mimeType ?? '').trim().toLowerCase();

  if (mimeTypeToExtension.has(normalizedMimeType)) {
    return normalizedMimeType;
  }

  const extension = path.extname(String(fileName ?? '')).toLowerCase();
  return extensionToMimeType.get(extension) ?? null;
}

function normalizeBase64Content(contentBase64, emptyPayloadMessage) {
  const normalized = String(contentBase64 ?? '').trim();

  if (!normalized) {
    throw new HttpError(400, emptyPayloadMessage);
  }

  const [, dataPart = normalized] = normalized.split(',');
  return dataPart.replace(/\s/g, '');
}

async function storeBase64File({
  fileName,
  mimeType,
  contentBase64,
  mimeTypeToExtension,
  extensionToMimeType,
  directory,
  invalidTypeMessage,
  emptyPayloadMessage,
  invalidPayloadMessage,
  maxSizeBytes,
  sizeLimitMessage,
  relativeDirectoryName,
}) {
  const normalizedMimeType = resolveMimeType(
    mimeType,
    fileName,
    mimeTypeToExtension,
    extensionToMimeType,
  );

  if (!normalizedMimeType) {
    throw new HttpError(400, invalidTypeMessage);
  }

  const normalizedBase64 = normalizeBase64Content(contentBase64, emptyPayloadMessage);
  const buffer = Buffer.from(normalizedBase64, 'base64');

  if (buffer.length === 0) {
    throw new HttpError(400, invalidPayloadMessage ?? emptyPayloadMessage);
  }

  if (buffer.length > maxSizeBytes) {
    throw new HttpError(400, sizeLimitMessage);
  }

  await mkdir(directory, { recursive: true });

  const extension = mimeTypeToExtension.get(normalizedMimeType);
  const savedFileName = `${randomUUID()}${extension}`;
  const filePath = path.join(directory, savedFileName);

  await writeFile(filePath, buffer);

  return {
    relativePath: `/uploads/${relativeDirectoryName}/${savedFileName}`,
    mimeType: normalizedMimeType,
    sizeBytes: buffer.length,
  };
}

export async function storeProfileImage({ fileName, mimeType, contentBase64 }) {
  return storeBase64File({
    fileName,
    mimeType,
    contentBase64,
    mimeTypeToExtension: IMAGE_MIME_TYPE_TO_EXTENSION,
    extensionToMimeType: IMAGE_EXTENSION_TO_MIME_TYPE,
    directory: PROFILE_IMAGE_DIRECTORY,
    invalidTypeMessage: 'Faqat JPG, PNG, WEBP yoki GIF rasm yuklash mumkin.',
    emptyPayloadMessage: "Rasm ma'lumoti bo'sh.",
    invalidPayloadMessage: "Rasm ma'lumotini o'qib bo'lmadi.",
    maxSizeBytes: MAX_PROFILE_IMAGE_SIZE_BYTES,
    sizeLimitMessage: 'Profil rasmi 3 MB dan oshmasligi kerak.',
    relativeDirectoryName: 'profile-images',
  });
}

export async function storeApplicationDocument({ fileName, mimeType, contentBase64 }) {
  return storeBase64File({
    fileName,
    mimeType,
    contentBase64,
    mimeTypeToExtension: DOCUMENT_MIME_TYPE_TO_EXTENSION,
    extensionToMimeType: DOCUMENT_EXTENSION_TO_MIME_TYPE,
    directory: APPLICATION_DOCUMENT_DIRECTORY,
    invalidTypeMessage: 'Faqat PDF hujjat yuklash mumkin.',
    emptyPayloadMessage: "Hujjat ma'lumoti bo'sh.",
    invalidPayloadMessage: "Hujjat ma'lumotini o'qib bo'lmadi.",
    maxSizeBytes: MAX_APPLICATION_DOCUMENT_SIZE_BYTES,
    sizeLimitMessage: 'Hujjat hajmi 10 MB dan oshmasligi kerak.',
    relativeDirectoryName: 'application-documents',
  });
}

export function buildUploadUrl(req, relativePath) {
  return `${req.protocol}://${req.get('host')}${relativePath}`;
}

export async function deleteLocalUploadFromUrl(fileUrl) {
  if (!fileUrl) {
    return;
  }

  let pathname = '';

  try {
    pathname = new URL(String(fileUrl)).pathname;
  } catch {
    pathname = String(fileUrl).startsWith('/') ? String(fileUrl) : '';
  }

  const uploadPrefixes = ['/uploads/profile-images/', '/uploads/application-documents/'];

  if (!uploadPrefixes.some((prefix) => pathname.startsWith(prefix))) {
    return;
  }

  const relativeFilePath = pathname.replace('/uploads/', '');
  const filePath = path.resolve(UPLOAD_ROOT, relativeFilePath);

  if (!filePath.startsWith(UPLOAD_ROOT)) {
    return;
  }

  await rm(filePath, { force: true });
}
