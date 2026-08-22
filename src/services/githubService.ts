import { DART_CODEBASE } from '../data/dartCodebase';

export interface GitHubUploadProgress {
  total: number;
  current: number;
  currentFile: string;
  status: 'idle' | 'checking' | 'uploading' | 'completed' | 'error';
  message: string;
  repoUrl?: string;
  actionsUrl?: string;
}

export class GitHubService {
  /**
   * Helper to encode unicode strings to Base64 in browser safely
   */
  private static encodeBase64(str: string): string {
    return btoa(unescape(encodeURIComponent(str)));
  }

  /**
   * Check if repo exists and token is valid
   */
  public static async verifyRepoAccess(
    owner: string,
    repo: string,
    token: string
  ): Promise<{ success: boolean; message: string; defaultBranch?: string }> {
    try {
      const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
        headers: {
          Authorization: `Bearer ${token.trim()}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });

      if (response.status === 401) {
        return { success: false, message: 'Token de GitHub inválido o caducado.' };
      }
      if (response.status === 404) {
        return {
          success: false,
          message: `El repositorio "${owner}/${repo}" no fue encontrado o tu token no tiene permisos de lectura/escritura (repo).`,
        };
      }
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        return { success: false, message: errData.message || `Error HTTP ${response.status}` };
      }

      const repoData = await response.json();
      return {
        success: true,
        message: 'Conexión exitosa con el repositorio.',
        defaultBranch: repoData.default_branch || 'main',
      };
    } catch (err: any) {
      return { success: false, message: err.message || 'Error de conexión de red.' };
    }
  }

  /**
   * Upload all Flutter/Dart files directly into the GitHub repository
   */
  public static async uploadFlutterCodebase(
    owner: string,
    repo: string,
    token: string,
    branch: string = 'main',
    onProgress: (progress: GitHubUploadProgress) => void
  ): Promise<{ success: boolean; message: string; actionsUrl?: string; repoUrl?: string }> {
    const cleanOwner = owner.trim();
    const cleanRepo = repo.trim();
    const cleanToken = token.trim();
    const repoUrl = `https://github.com/${cleanOwner}/${cleanRepo}`;
    const actionsUrl = `https://github.com/${cleanOwner}/${cleanRepo}/actions`;

    try {
      onProgress({
        total: DART_CODEBASE.length,
        current: 0,
        currentFile: 'Verificando repositorio...',
        status: 'checking',
        message: 'Conectando con GitHub API...',
      });

      // 1. Check access
      const accessCheck = await this.verifyRepoAccess(cleanOwner, cleanRepo, cleanToken);
      if (!accessCheck.success) {
        throw new Error(accessCheck.message);
      }

      const targetBranch = branch || accessCheck.defaultBranch || 'main';

      // 2. Iterate and upload/update each file
      for (let i = 0; i < DART_CODEBASE.length; i++) {
        const file = DART_CODEBASE[i];

        onProgress({
          total: DART_CODEBASE.length,
          current: i + 1,
          currentFile: file.path,
          status: 'uploading',
          message: `Subiendo [${i + 1}/${DART_CODEBASE.length}]: ${file.path}`,
        });

        // Check if file already exists in repo to obtain its SHA (required by GitHub API for updates)
        let existingSha: string | undefined = undefined;
        try {
          const fileCheck = await fetch(
            `https://api.github.com/repos/${cleanOwner}/${cleanRepo}/contents/${file.path}?ref=${targetBranch}`,
            {
              headers: {
                Authorization: `Bearer ${cleanToken}`,
                Accept: 'application/vnd.github.v3+json',
              },
            }
          );
          if (fileCheck.ok) {
            const fileInfo = await fileCheck.json();
            existingSha = fileInfo.sha;
          }
        } catch {
          // If check fails, we proceed without SHA (new file creation)
        }

        // Upload/Update file content via PUT
        const bodyPayload: any = {
          message: `Add/Update Flutter code: ${file.path}`,
          content: this.encodeBase64(file.code),
          branch: targetBranch,
        };
        if (existingSha) {
          bodyPayload.sha = existingSha;
        }

        const putResponse = await fetch(
          `https://api.github.com/repos/${cleanOwner}/${cleanRepo}/contents/${file.path}`,
          {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${cleanToken}`,
              'Content-Type': 'application/json',
              Accept: 'application/vnd.github.v3+json',
            },
            body: JSON.stringify(bodyPayload),
          }
        );

        if (!putResponse.ok) {
          const errData = await putResponse.json().catch(() => ({}));
          throw new Error(
            `Error al subir "${file.path}": ${errData.message || `HTTP ${putResponse.status}`}`
          );
        }

        // Short throttle to be gentle with GitHub API rate limits
        await new Promise((r) => setTimeout(r, 200));
      }

      onProgress({
        total: DART_CODEBASE.length,
        current: DART_CODEBASE.length,
        currentFile: 'Completado',
        status: 'completed',
        message: '¡Todos los archivos de Flutter y GitHub Actions se subieron con éxito!',
        repoUrl,
        actionsUrl,
      });

      return {
        success: true,
        message: 'Proyecto Flutter y workflow de APK subidos exitosamente a GitHub.',
        repoUrl,
        actionsUrl,
      };
    } catch (err: any) {
      const errMsg = err.message || 'Error inesperado al subir los archivos a GitHub.';
      onProgress({
        total: DART_CODEBASE.length,
        current: 0,
        currentFile: '',
        status: 'error',
        message: errMsg,
      });
      return { success: false, message: errMsg };
    }
  }
}
