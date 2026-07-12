// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		interface Platform {
			env: Env;
			ctx: ExecutionContext;
			caches: CacheStorage;
			cf?: IncomingRequestCfProperties;
		}

		// interface Error {}
		interface Locals {
			supabase: import('@supabase/supabase-js').SupabaseClient;
			safeGetSession: () => Promise<{
				session: import('@supabase/supabase-js').Session | null;
				user: import('@supabase/supabase-js').User | null;
			}>;
			user: import('@supabase/supabase-js').User | null;
			profile: {
				id: string;
				full_name: string | null;
				role: 'teacher' | 'director' | 'admin' | 'superadmin' | 'student' | 'tutor' | 'client';
				school_id: string | null;
			} | null;
		}
		// interface PageData {}
		// interface PageState {}
	}
}

export {};
