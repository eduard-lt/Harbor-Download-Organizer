import {
  Captions, Code, Disc3, Download, File, FileArchive, FileSpreadsheet, FileText, Film, Folder,
  Globe, Image, Music, Package, Presentation, type LucideIcon,
} from 'lucide-react';

/**
 * The backend names file kinds with Material Icon identifiers. The UI draws every
 * kind with one monochrome line-icon family, so the names map here, not in Rust.
 */
const fileIcons: Record<string, LucideIcon> = {
  image: Image,
  photo: Image,
  movie: Film,
  music_note: Music,
  description: FileText,
  table_chart: FileSpreadsheet,
  slideshow: Presentation,
  folder_zip: FileArchive,
  install_desktop: Package,
  album: Disc3,
  download: Download,
  web: Globe,
  code: Code,
  subtitles: Captions,
  folder: Folder,
  insert_drive_file: File,
};

export function fileIcon(name?: string): LucideIcon {
  return (name && fileIcons[name]) || File;
}
