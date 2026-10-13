import React from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const chartColors = ['#2c4d73', '#48c2c0', '#f2c343', '#829bb3', '#83b8a8'];
const tooltipStyle = {
  border: '1px solid #dbe4ec',
  borderRadius: '12px',
  boxShadow: '0 8px 24px rgba(16, 29, 43, 0.12)',
};

const DashboardAnalytics = ({
  barData,
  barTitle,
  description,
  distributionData,
  distributionTitle,
  title = 'Analytics overview',
}) => (
  <section className="space-y-4" aria-label={title}>
    <div>
      <h2 className="text-xl font-black text-[#172536]">{title}</h2>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </div>

    <div className="grid gap-5 lg:grid-cols-2">
      <article className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-bold text-slate-700">{barTitle}</h3>
        {barData.length ? (
          <div className="mt-4 h-64" role="img" aria-label={barTitle}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 8, right: 8, left: -18, bottom: 4 }}>
                <CartesianGrid stroke="#e8eef3" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#f1f5f9' }} />
                <Bar dataKey="value" fill="#2c4d73" radius={[6, 6, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="mt-4 flex h-64 items-center justify-center rounded-xl bg-slate-50 text-sm text-slate-500">
            Not enough data to show this chart yet.
          </p>
        )}
      </article>

      <article className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-bold text-slate-700">{distributionTitle}</h3>
        {distributionData.length ? (
          <div className="mt-4 h-64" role="img" aria-label={distributionTitle}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={distributionData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={58}
                  outerRadius={88}
                  paddingAngle={3}
                  stroke="none"
                >
                  {distributionData.map((entry, index) => (
                    <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="mt-4 flex h-64 items-center justify-center rounded-xl bg-slate-50 text-sm text-slate-500">
            Not enough data to show this chart yet.
          </p>
        )}
        {distributionData.length > 0 && (
          <ul className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs text-slate-600">
            {distributionData.map((entry, index) => (
              <li key={entry.name} className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: chartColors[index % chartColors.length] }} />
                {entry.name}: <span className="font-bold text-slate-800">{entry.value}</span>
              </li>
            ))}
          </ul>
        )}
      </article>
    </div>
  </section>
);

export default DashboardAnalytics;
