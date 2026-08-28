export interface StorageConfig {
  endPoint: string;
  port: number;
  useSSL: boolean;
  accessKey: string;
  secretKey: string;
  bucket: string;
}

function requireEnv(
  env: NodeJS.ProcessEnv,
  key: keyof NodeJS.ProcessEnv,
): string {
  const value = env[key]?.trim();

  if (!value) {
    throw new Error(`${key} is not configured`);
  }

  return value;
}

export function resolveStorageConfig(
  env: NodeJS.ProcessEnv = process.env,
): StorageConfig {
  const portValue = requireEnv(env, 'MINIO_PORT');
  const port = Number(portValue);

  if (!Number.isInteger(port) || port <= 0 || port > 65_535) {
    throw new Error('MINIO_PORT must be a valid TCP port');
  }

  const useSSLValue = requireEnv(env, 'MINIO_USE_SSL').toLowerCase();
  if (useSSLValue !== 'true' && useSSLValue !== 'false') {
    throw new Error('MINIO_USE_SSL must be true or false');
  }

  return {
    endPoint: requireEnv(env, 'MINIO_ENDPOINT'),
    port,
    useSSL: useSSLValue === 'true',
    accessKey: requireEnv(env, 'MINIO_ACCESS_KEY'),
    secretKey: requireEnv(env, 'MINIO_SECRET_KEY'),
    bucket: requireEnv(env, 'MINIO_BUCKET'),
  };
}
