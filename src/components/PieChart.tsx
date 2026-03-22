import React from 'react';

interface PieChartData {
  name: string;
  value: number;
  color: string;
}

interface PieChartProps {
  data: PieChartData[];
}

const PieChart: React.FC<PieChartProps> = ({ data }) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  if (total === 0) return <div className="text-center text-gray-500">No data to display</div>;

  let cumulativePercent = 0;

  const getCoordinatesForPercent = (percent: number) => {
    const x = Math.cos(2 * Math.PI * percent);
    const y = Math.sin(2 * Math.PI * percent);
    return [x, y];
  };

  const slices = data.map(slice => {
    const [startX, startY] = getCoordinatesForPercent(cumulativePercent);
    const percent = slice.value / total;
    cumulativePercent += percent;
    const [endX, endY] = getCoordinatesForPercent(cumulativePercent);

    const largeArcFlag = percent > 0.5 ? 1 : 0;

    const pathData = [
      `M ${startX} ${startY}`, // Move
      `A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY}`, // Arc
      'L 0 0', // Line
    ].join(' ');

    return <path key={slice.name} d={pathData} fill={slice.color}></path>;
  });

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="-1 -1 2 2" className="w-40 h-40 transform -rotate-90">
        {slices}
      </svg>
      <div className="mt-4 w-full">
        <ul className="text-xs text-gray-300 space-y-1">
          {data.map(slice => (
            <li key={slice.name} className="flex items-center">
              <span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: slice.color }}></span>
              <span>{slice.name}</span>
              <span className="ml-auto text-gray-400 font-semibold">{((slice.value / total) * 100).toFixed(0)}%</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default PieChart;