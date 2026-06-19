<script lang="ts">
  import { Compass, BookOpen, Monitor, ShieldCheck, Database, Server, ChevronRight } from 'lucide-svelte';

  const services = [
    {
      id: 1,
      name: "Inventario de PCs",
      description: "Control absoluto del hardware y software de tu institución.",
      price: "$2,500/mes",
      icon: Monitor,
      features: ["Reportes automáticos", "Alertas de mantenimiento", "Gestión de licencias"]
    },
    {
      id: 2,
      name: "Control de Ingreso/Egreso",
      description: "Gestión segura del flujo de alumnos y personal docente.",
      price: "$3,000/mes",
      icon: ShieldCheck,
      features: ["Asistencia en tiempo real", "Notificaciones a tutores", "Integración con molinetes"]
    },
    {
      id: 3,
      name: "Gestión Académica",
      description: "Plataforma centralizada para notas, asistencias y comunicados.",
      price: "$5,000/mes",
      icon: Database,
      features: ["Portal para padres", "Boletines digitales", "Calendario escolar"]
    },
    {
      id: 4,
      name: "Hosting y Servidores",
      description: "Alojamiento web optimizado para plataformas educativas.",
      price: "$1,500/mes",
      icon: Server,
      features: ["Alta disponibilidad", "Backups diarios", "Soporte técnico 24/7"]
    }
  ];
</script>

<div class="flex flex-col min-h-screen">
  <!-- Header -->
  <header class="border-b bg-white/80 backdrop-blur-md sticky top-0 z-50">
    <div class="container mx-auto px-4 h-20 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="relative flex items-center justify-center w-12 h-12 bg-primary rounded-xl text-white shadow-lg">
          <Compass class="absolute w-8 h-8 opacity-80" />
          <BookOpen class="absolute w-5 h-5 text-accent" />
        </div>
        <div class="flex flex-col">
          <span class="text-2xl font-bold tracking-tight text-primary leading-none">NMF</span>
          <span class="text-xs font-semibold text-secondary-foreground uppercase tracking-widest">Soluciones Educativas</span>
        </div>
      </div>
      
      <nav class="hidden md:flex items-center gap-8 font-medium text-sm">
        <a href="#servicios" class="text-slate-600 hover:text-primary transition-colors">Servicios</a>
        <a href="#nosotros" class="text-slate-600 hover:text-primary transition-colors">Nosotros</a>
        <a href="#contacto" class="text-slate-600 hover:text-primary transition-colors">Contacto</a>
      </nav>

      <div class="flex items-center gap-4">
        <a href="/login" class="text-sm font-medium text-primary hover:text-primary/80 transition-colors">Iniciar sesión</a>
        <a href="/contacto" class="hidden md:inline-flex h-10 items-center justify-center rounded-md bg-accent px-6 text-sm font-medium text-accent-foreground shadow transition-colors hover:bg-accent/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          Solicitar Demo
        </a>
      </div>
    </div>
  </header>

  <main class="flex-1">
    <!-- Hero Section -->
    <section class="relative overflow-hidden bg-slate-50 pt-24 pb-32">
      <div class="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
      <div class="absolute -top-24 -left-24 w-96 h-96 bg-primary/10 rounded-full blur-3xl"></div>
      <div class="absolute top-48 right-0 w-96 h-96 bg-accent/10 rounded-full blur-3xl"></div>
      
      <div class="container mx-auto px-4 relative z-10">
        <div class="max-w-4xl mx-auto text-center space-y-8">
          <div class="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-sm font-medium text-primary mb-4">
            🚀 Innovación y Conocimiento para el Futuro
          </div>
          <h1 class="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900">
            Transformamos la <span class="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">gestión educativa</span> con tecnología.
          </h1>
          <p class="text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Plataformas modernas, seguras y escalables diseñadas específicamente para instituciones que buscan optimizar sus procesos.
          </p>
          <div class="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <a href="#servicios" class="inline-flex h-12 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90">
              Ver Servicios
            </a>
            <a href="/contacto" class="inline-flex h-12 items-center justify-center rounded-md border border-slate-200 bg-white px-8 text-sm font-medium text-slate-900 shadow-sm transition-colors hover:bg-slate-100">
              Hablar con un asesor
            </a>
          </div>
        </div>
      </div>
    </section>

    <!-- Services Section -->
    <section id="servicios" class="py-24 bg-white">
      <div class="container mx-auto px-4">
        <div class="text-center max-w-2xl mx-auto mb-16">
          <h2 class="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Nuestros Planes y Servicios</h2>
          <p class="mt-4 text-lg text-slate-600">Soluciones integrales para cubrir todas las necesidades de tu institución educativa.</p>
        </div>

        <div class="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {#each services as service}
            {@const ServiceIcon = service.icon}
            <div class="group relative flex flex-col justify-between rounded-2xl border bg-white p-6 shadow-sm transition-all hover:shadow-xl hover:-translate-y-1 hover:border-primary/30">
              <div>
                <div class="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                  <ServiceIcon class="h-6 w-6" />
                </div>
                <h3 class="text-xl font-bold text-slate-900 mb-2">{service.name}</h3>
                <p class="text-slate-600 mb-6 text-sm line-clamp-2">{service.description}</p>
                
                <ul class="space-y-3 mb-8">
                  {#each service.features as feature}
                    <li class="flex items-center text-sm text-slate-700">
                      <ShieldCheck class="mr-2 h-4 w-4 text-accent" />
                      {feature}
                    </li>
                  {/each}
                </ul>
              </div>
              
              <div>
                <div class="mb-4 text-2xl font-bold text-primary">{service.price}</div>
                <a href="/checkout/{service.id}" class="inline-flex w-full h-10 items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow transition-colors hover:bg-accent hover:text-white group-hover:bg-primary">
                  Contratar <ChevronRight class="ml-2 h-4 w-4" />
                </a>
              </div>
            </div>
          {/each}
        </div>
      </div>
    </section>
  </main>

  <footer class="bg-slate-950 text-slate-400 py-12">
    <div class="container mx-auto px-4 grid md:grid-cols-4 gap-8">
      <div class="md:col-span-2">
        <div class="flex items-center gap-2 mb-4">
          <div class="relative flex items-center justify-center w-8 h-8 bg-primary rounded-lg text-white">
            <Compass class="absolute w-5 h-5 opacity-80" />
          </div>
          <span class="text-xl font-bold text-white">NMF Soluciones</span>
        </div>
        <p class="max-w-sm text-sm">Innovación y conocimiento para el futuro. Desarrollamos herramientas que potencian la educación.</p>
      </div>
      <div>
        <h4 class="text-white font-semibold mb-4">Servicios</h4>
        <ul class="space-y-2 text-sm">
          <li><a href="/" class="hover:text-white transition-colors">Inventario de PCs</a></li>
          <li><a href="/" class="hover:text-white transition-colors">Control de Ingreso</a></li>
          <li><a href="/" class="hover:text-white transition-colors">Gestión Académica</a></li>
        </ul>
      </div>
      <div>
        <h4 class="text-white font-semibold mb-4">Contacto</h4>
        <ul class="space-y-2 text-sm">
          <li>soporte@nmf-soluciones.com</li>
          <li>+54 9 11 1234-5678</li>
        </ul>
      </div>
    </div>
  </footer>
</div>
