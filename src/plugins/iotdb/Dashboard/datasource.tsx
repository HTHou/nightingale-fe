import _ from 'lodash';
import moment from 'moment';
import { IRawTimeRange, parseRange } from '@/components/TimeRangePicker';
import { DatasourceCateEnum } from '@/utils/constant';
import replaceTemplateVariables from '@/pages/dashboard/Variables/utils/replaceTemplateVariables';
import { getDsQuery } from '../services';
import replaceExpressionBracket from '@/pages/dashboard/Renderer/utils/replaceExpressionBracket';
import { getIntervalSeconds, getSerieName, normalizeQueryKeys } from '../utils';
import { N9E_PATHNAME } from '@/utils/constant';

interface IOptions {
  id?: string;
  datasourceValue: number;
  time: IRawTimeRange;
  targets: any[];
  spanNulls?: boolean;
  scopedVars?: any;
  inspect?: boolean;
  queryOptionsTime?: IRawTimeRange;
  panelWidth?: number;
  maxDataPoints?: number;
}

interface Result {
  series: any[];
  query?: any[];
}

export default async function iotdbQuery(options: IOptions): Promise<Result> {
  const { time, targets, datasourceValue, queryOptionsTime, panelWidth, maxDataPoints } = options;
  if (!time.start) return Promise.resolve({ series: [] });
  const parsedRange = parseRange(time);
  const series: any[] = [];
  let refIds: string[] = [];
  if (targets && typeof datasourceValue === 'number') {
    _.forEach(targets, (target) => {
      refIds.push(target.refId);
    });
    const effectiveRange = queryOptionsTime ? parseRange(queryOptionsTime) : parsedRange;
    const start = moment(effectiveRange.start).toISOString();
    const end = moment(effectiveRange.end).toISOString();
    const interval = getIntervalSeconds(queryOptionsTime || time, { panelWidth, maxDataPoints });
    const queryParmas = {
      cate: DatasourceCateEnum.iotdb,
      datasource_id: datasourceValue,
      query: _.map(targets, (target) => {
        const query: any = target.query || {};
        return {
          ref: target.refId,
          from: start,
          to: end,
          interval,
          query: replaceTemplateVariables(query.query, {
            range: queryOptionsTime || time,
            step: interval,
            scopedVars: options.scopedVars,
          }),
          keys: normalizeQueryKeys(query.keys),
        };
      }),
    };
    try {
      let batchQueryRes: any = {};
      if (!_.isEmpty(targets) && _.some(targets, (target) => target.query?.query)) {
        batchQueryRes = await getDsQuery(queryParmas);
        _.forEach(batchQueryRes, (serie, i) => {
          const target = _.find(targets, (t) => t.refId === serie.ref) || (targets.length === 1 ? targets[0] : _.find(targets, (t) => t.refId === refIds[i]));
          if (!target?.hide) {
            series.push({
              id: _.uniqueId('series_'),
              refId: serie.ref,
              name: target?.legend ? replaceExpressionBracket(target?.legend, serie.metric) : getSerieName(serie.metric),
              metric: serie.metric,
              data: serie.values,
            });
          }
        });
      }
      const resolveData: Result = { series };
      if (options.inspect) {
        resolveData.query = [];
        resolveData.query.push({
          type: 'Query Range',
          request: {
            url: `/api/${N9E_PATHNAME}/ds-query`,
            method: 'POST',
            data: queryParmas,
          },
          response: batchQueryRes,
        });
      }
      return Promise.resolve(resolveData);
    } catch (e) {
      console.error(e);
      return Promise.reject(e);
    }
  }
  return Promise.resolve({
    series: [],
  });
}
