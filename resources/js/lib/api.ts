/**
 * Same-origin JSON client for /api/v1 (session + CSRF).
 * Mobile should use Bearer tokens from POST /api/v1/login instead.
 */

export class ApiError extends Error {
    constructor(
        message: string,
        readonly status: number,
        readonly body: unknown,
    ) {
        super(message);
        this.name = 'ApiError';
    }

    fieldErrors(): Record<string, string> {
        if (
            typeof this.body !== 'object' ||
            this.body === null ||
            !('errors' in this.body)
        ) {
            return {};
        }

        const errors = (this.body as { errors?: Record<string, string[]> })
            .errors;

        if (!errors) {
            return {};
        }

        return Object.fromEntries(
            Object.entries(errors).map(([key, messages]) => [
                key,
                messages[0] ?? 'Valeur invalide.',
            ]),
        );
    }
}

function xsrfToken(): string | null {
    const match = document.cookie
        .split('; ')
        .find((row) => row.startsWith('XSRF-TOKEN='));

    if (!match) {
        return null;
    }

    return decodeURIComponent(match.slice('XSRF-TOKEN='.length));
}

function schoolAnneeHeader(): string | null {
    if (typeof window === 'undefined') {
        return null;
    }

    return new URL(window.location.href).searchParams.get('annee');
}

type ApiJsonOptions = {
    method?: string;
    body?: unknown;
    formData?: FormData;
};

export async function apiJson<T = unknown>(
    url: string,
    options: ApiJsonOptions = {},
): Promise<T> {
    const method = (options.method ?? 'GET').toUpperCase();
    const headers: Record<string, string> = {
        Accept: 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
    };

    const token = xsrfToken();

    if (token) {
        headers['X-XSRF-TOKEN'] = token;
    }

    const annee = schoolAnneeHeader();

    if (annee) {
        headers['X-School-Annee'] = annee;
    }

    let body: BodyInit | undefined;

    if (options.formData) {
        body = options.formData;

        if (method !== 'GET' && method !== 'POST') {
            options.formData.append('_method', method);
        }
    } else if (options.body !== undefined) {
        headers['Content-Type'] = 'application/json';
        body = JSON.stringify(options.body);
    }

    const response = await fetch(url, {
        method: options.formData && method !== 'GET' ? 'POST' : method,
        credentials: 'same-origin',
        headers,
        body,
    });

    const text = await response.text();
    let parsed: unknown = null;

    if (text !== '') {
        try {
            parsed = JSON.parse(text) as unknown;
        } catch {
            parsed = text;
        }
    }

    if (!response.ok) {
        const message =
            typeof parsed === 'object' &&
            parsed !== null &&
            'message' in parsed &&
            typeof (parsed as { message: unknown }).message === 'string'
                ? (parsed as { message: string }).message
                : `Erreur API (${response.status})`;

        throw new ApiError(message, response.status, parsed);
    }

    return parsed as T;
}

export async function apiData<T>(
    url: string,
    options?: ApiJsonOptions,
): Promise<T> {
    const json = await apiJson<{ data: T }>(url, options);

    return json.data;
}
