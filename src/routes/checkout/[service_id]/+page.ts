import { landing } from '$lib/supabaseClient';
import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params }) => {
  const serviceId = params.service_id;

  // Intentamos obtener el servicio de Supabase (landing es null server-side
  // fuera del browser: cae al fallback de abajo en vez de romper el load)
  let data: { id: number; name: string; description: string; price: string } | null = null;
  try {
    const result = await landing.from('services').select('*').eq('id', serviceId).single();
    data = result.data;
  } catch {
    // sin cliente disponible (SSR/build) — seguimos al fallback
  }

  if (data) {
    return {
      service: data
    };
  }

  // Si falla o no existe la base de datos aun, proveemos un fallback basado en la ID para que no falle el demo local
  const fallbacks = [
    { id: 1, name: "Inventario de PCs", description: "Control absoluto del hardware y software de tu institución.", price: "$2,500/mes" },
    { id: 2, name: "Control de Ingreso/Egreso", description: "Gestión segura del flujo de alumnos y personal docente.", price: "$3,000/mes" },
    { id: 3, name: "Gestión Académica", description: "Plataforma centralizada para notas, asistencias y comunicados.", price: "$5,000/mes" },
    { id: 4, name: "Hosting y Servidores", description: "Alojamiento web optimizado para plataformas educativas.", price: "$1,500/mes" }
  ];

  const fallback = fallbacks.find(f => f.id === Number(serviceId));
  
  if (fallback) {
    return {
      service: fallback
    };
  }

  throw error(404, 'Servicio no encontrado');
};
