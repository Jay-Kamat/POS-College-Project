// Client-side CSV Exporter Utility
export const exportToCsv = (filename, rows, headers) => {
  if (!rows || !rows.length) {
    alert("No data available to export.");
    return;
  }

  const separator = ',';
  const headerKeys = headers ? headers.map(h => h.key) : Object.keys(rows[0]);
  const headerLabels = headers ? headers.map(h => `"${h.label}"`) : headerKeys.map(k => `"${k}"`);

  const csvContent = [
    headerLabels.join(separator),
    ...rows.map(row =>
      headerKeys.map(key => {
        let cell = row[key];
        if (cell === null || cell === undefined) cell = '';
        if (typeof cell === 'string') {
          cell = cell.replace(/"/g, '""');
          return `"${cell}"`;
        }
        return cell;
      }).join(separator)
    )
  ].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
