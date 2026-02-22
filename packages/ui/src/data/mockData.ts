export interface ActivityLog {
  id: string;
  timestamp: string;
  filename: string;
  icon: string;
  iconColor: string;
  sourcePath: string;
  destPath: string;
  status: 'success' | 'conflict' | 'ignored';
}

export const activityLogs: ActivityLog[] = [
  {
    id: '1',
    timestamp: '2 mins ago',
    filename: 'sunset_over_harbor.jpg',
    icon: 'image',
    iconColor: 'blue',
    sourcePath: 'Downloads/',
    destPath: 'Images/2023/',
    status: 'success',
  },
  {
    id: '2',
    timestamp: '15 mins ago',
    filename: 'quarterly_report_v2.pdf',
    icon: 'description',
    iconColor: 'amber',
    sourcePath: 'Desktop/',
    destPath: 'Work/Reports/',
    status: 'success',
  },
  {
    id: '3',
    timestamp: '42 mins ago',
    filename: 'main_interface_final.js',
    icon: 'code',
    iconColor: 'purple',
    sourcePath: 'Attachments/',
    destPath: 'Projects/Harbor/',
    status: 'conflict',
  },
  {
    id: '4',
    timestamp: '1 hour ago',
    filename: 'tutorial_recording.mp4',
    icon: 'videocam',
    iconColor: 'indigo',
    sourcePath: 'Captures/',
    destPath: 'Media/Videos/',
    status: 'success',
  },
  {
    id: '5',
    timestamp: '1 hour ago',
    filename: 'legacy_backup_old.zip',
    icon: 'archive',
    iconColor: 'red',
    sourcePath: 'Desktop/',
    destPath: 'Archive/',
    status: 'success',
  },
  {
    id: '6',
    timestamp: '2 hours ago',
    filename: 'harbor_blueprint_v1.png',
    icon: 'image',
    iconColor: 'blue',
    sourcePath: 'Desktop/',
    destPath: 'Projects/Assets/',
    status: 'success',
  },
  {
    id: '7',
    timestamp: '2 hours ago',
    filename: 'meeting_notes.docx',
    icon: 'description',
    iconColor: 'slate',
    sourcePath: 'Documents/',
    destPath: 'Work/Notes/',
    status: 'success',
  },
  {
    id: '8',
    timestamp: '3 hours ago',
    filename: 'assets_bundle.zip',
    icon: 'folder_zip',
    iconColor: 'amber',
    sourcePath: 'Downloads/',
    destPath: 'Archive/Current/',
    status: 'success',
  },
  {
    id: '9',
    timestamp: '3 hours ago',
    filename: 'deploy_script.sh',
    icon: 'terminal',
    iconColor: 'purple',
    sourcePath: 'Documents/Scripts/',
    destPath: 'Dev/Ops/',
    status: 'success',
  },
  {
    id: '10',
    timestamp: '4 hours ago',
    filename: 'intro_sequence.mov',
    icon: 'movie',
    iconColor: 'indigo',
    sourcePath: 'Videos/Raw/',
    destPath: 'Media/Production/',
    status: 'success',
  },
];

export interface Rule {
  id: string;
  name: string;
  icon: string;
  iconColor: string;
  extensions: string[];
  destination: string;
  enabled: boolean;
}

export const rules: Rule[] = [
  {
    id: '1',
    name: 'Photography',
    icon: 'image',
    iconColor: 'indigo',
    extensions: ['.jpg', '.png', '.gif', '.raw'],
    destination: '/Downloads/Media/Photos',
    enabled: true,
  },
  {
    id: '2',
    name: 'Work Documents',
    icon: 'description',
    iconColor: 'amber',
    extensions: ['.pdf', '.docx', '.xlsx'],
    destination: '/Documents/Work/Harbor',
    enabled: true,
  },
  {
    id: '3',
    name: 'Video Projects',
    icon: 'movie',
    iconColor: 'slate',
    extensions: ['.mp4', '.mov', '.mkv'],
    destination: '/Movies/Archive',
    enabled: false,
  },
];

export interface RecentActivity {
  id: string;
  filename: string;
  icon: string;
  iconColor: string;
  status: 'success' | 'ignored';
  actionTaken: string;
  time: string;
}

export const recentActivity: RecentActivity[] = [
  {
    id: '1',
    filename: 'sunset_vacation_01.jpg',
    icon: 'image',
    iconColor: 'indigo',
    status: 'success',
    actionTaken: 'Moved to /Media/Photos',
    time: '2 min ago',
  },
  {
    id: '2',
    filename: 'quarterly_report_q3.pdf',
    icon: 'description',
    iconColor: 'amber',
    status: 'success',
    actionTaken: 'Renamed & Organized',
    time: '14 min ago',
  },
  {
    id: '3',
    filename: 'project_assets_final.zip',
    icon: 'folder_zip',
    iconColor: 'slate',
    status: 'ignored',
    actionTaken: 'No matching rule found',
    time: '1h ago',
  },
];
