import _ from 'lodash';
import moment from 'moment';
import { IRawTimeRange, parseRange } from '@/components/TimeRangePicker';

export const getSerieName = (metric: any) => {
  const metricName = metric?.__name__ || '';
  const labels = _.keys(metric)
    .filter((ml) => ml !== '__name__')
    .map((label) => {
      return `${label}="${metric[label]}"`;
    });

  return `${metricName}{${_.join(labels, ',')}}`;
};

export const normalizeQueryKeys = (keys: any = {}) => {
  const valueKey = _.isArray(keys?.valueKey) ? _.join(keys.valueKey, ' ') : keys?.valueKey || (_.isArray(keys?.metricKey) ? _.join(keys.metricKey, ' ') : keys?.metricKey);
  const labelKey = _.isArray(keys?.labelKey) ? _.join(keys.labelKey, ' ') : keys?.labelKey;

  return {
    valueKey,
    metricKey: valueKey,
    labelKey,
    timeKey: keys?.timeKey,
    timeFormat: keys?.timeFormat,
  };
};

export const normalizeInterval = (value?: number, unit?: 'second' | 'min' | 'hour') => {
  if (!value) return value;
  if (unit === 'min') return value * 60;
  if (unit === 'hour') return value * 60 * 60;
  return value;
};

export const getIntervalSeconds = (time: IRawTimeRange, options?: { panelWidth?: number; maxDataPoints?: number }) => {
  if (!time?.start) return undefined;
  const maxDataPoints = options?.maxDataPoints ?? options?.panelWidth ?? 240;
  const parsedRange = parseRange(time);
  const start = moment(parsedRange.start).unix();
  const end = moment(parsedRange.end).unix();
  return Math.max(Math.floor((end - start) / maxDataPoints), 1);
};
