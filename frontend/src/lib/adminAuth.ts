type AdminTokenPayload = {
  exp?: number;
  role?: string;
};

const adminTokenKey = 'simvorae_admin_token';

function decodeAdminToken(token: string): AdminTokenPayload | null {
  try {
    const [, encodedPayload] = token.split('.');

    if (!encodedPayload) {
      return null;
    }

    return JSON.parse(window.atob(encodedPayload.replace(/-/g, '+').replace(/_/g, '/'))) as AdminTokenPayload;
  } catch {
    return null;
  }
}

export function getAdminToken() {
  return window.localStorage.getItem(adminTokenKey);
}

export function setAdminToken(token: string) {
  window.localStorage.setItem(adminTokenKey, token);
}

export function clearAdminToken() {
  window.localStorage.removeItem(adminTokenKey);
}

export function isAdminTokenValid(token = getAdminToken()) {
  if (!token) {
    return false;
  }

  const payload = decodeAdminToken(token);

  if (!payload || payload.role !== 'admin') {
    return false;
  }

  if (payload.exp && payload.exp <= Math.floor(Date.now() / 1000)) {
    return false;
  }

  return true;
}
