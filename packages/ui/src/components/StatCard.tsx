interface StatCardProps {
  icon: string;
  iconBgClass: string;
  iconTextClass: string;
  label: string;
  value: string | number;
}

export function StatCard({ icon, iconBgClass, iconTextClass, label, value }: StatCardProps) {
  return (
    <div className="bg-white dark:bg-background-card p-6 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-4">
      <div
        className={`w-12 h-12 rounded-full flex items-center justify-center ${iconBgClass} ${iconTextClass}`}
      >
        <span className="material-icons-round text-2xl">{icon}</span>
      </div>
      <div>
        <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
        <p className="text-2xl font-bold dark:text-white">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </p>
      </div>
    </div>
  );
}
