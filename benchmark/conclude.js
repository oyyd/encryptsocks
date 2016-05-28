const ERROR_TYPES = {
  UNEXPECTED: 'unexpected error',
  TIMEOUT: 'timeout',
};

function getData(data) {
  let validCount = 0;
  let averageTime = 0;
  let errorRates = 0;

  let timeout = 0;
  let unexpected = 0;

  data.forEach((item) => {
    if (item.err) {
      errorRates += 1;
      if (item.err === ERROR_TYPES.TIMEOUT) {
        timeout += 1;
      } else {
        unexpected += 1;
      }
    } else {
      validCount += 1;
      averageTime += item.time;
    }
  });

  errorRates = `${errorRates / data.length * 100}%`;
  averageTime /= validCount;

  return {
    errorRates, averageTime, timeout,
    unexpected,
  };
}

function conclude(_data) {
  const data = getData(_data);

  const res = `Total: ${_data.length}\n`;

  return res + Object.keys(data).map(key => {
    const value = data[key];

    return `${key} = ${value}\n`;
  }).join('');
}

module.exports = {
  ERROR_TYPES,
  conclude,
};
