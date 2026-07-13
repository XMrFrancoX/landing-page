import {
  Package, Monitor, ShieldCheck, Database, Server, Calendar,
  Wifi, Lock, Cloud, Smartphone, CreditCard, Users, GraduationCap,
  BookOpen, Bell, Camera, MessageCircle, BarChart
} from 'lucide-svelte';
import type { ComponentType } from 'svelte';

export const SERVICE_ICONS: Record<string, ComponentType> = {
  Package, Monitor, ShieldCheck, Database, Server, Calendar,
  Wifi, Lock, Cloud, Smartphone, CreditCard, Users, GraduationCap,
  BookOpen, Bell, Camera, MessageCircle, BarChart
};

export const SERVICE_ICON_OPTIONS = Object.keys(SERVICE_ICONS);

export function getServiceIcon(name: string | null | undefined): ComponentType {
  return (name && SERVICE_ICONS[name]) || Package;
}
