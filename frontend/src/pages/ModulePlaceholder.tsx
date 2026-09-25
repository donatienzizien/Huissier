interface Props {
  title: string;
  sprint: string;
}

export default function ModulePlaceholder({ title, sprint }: Props) {
  const isFutureSprint = /^Sprint \d/.test(sprint);
  return (
    <div>
      <h1 className="text-xl font-semibold text-navy-900">{title}</h1>
      <div className="mt-6 bg-white rounded-lg border border-dashed border-gray-300 p-10 text-center text-gray-500 text-sm">
        {isFutureSprint ? `Module prévu au ${sprint} du planning (§7 du cahier des charges).` : sprint}
      </div>
    </div>
  );
}
