import { DataSourceWithBackend, getTemplateSrv } from '@grafana/runtime';
import { DataQueryRequest, DataFrame, MetricFindValue, DataSourceInstanceSettings, ScopedVars } from '@grafana/data';
import { SnowflakeQuery, SnowflakeVariableQuery, SnowflakeOptions } from './types';
import { switchMap, map } from 'rxjs/operators';

export class DataSource extends DataSourceWithBackend<SnowflakeQuery, SnowflakeOptions> {
  constructor(instanceSettings: DataSourceInstanceSettings<SnowflakeOptions>) {
    super(instanceSettings);
  }

  applyTemplateVariables(query: SnowflakeQuery, scopedVars: ScopedVars): SnowflakeQuery {
    query.queryText = getTemplateSrv().replace(query.queryText, scopedVars);
    return query;
  }

  filterQuery(query: SnowflakeQuery): boolean {
    return query.queryText !== '' && !query.hide;
  }

  async metricFindQuery(query: SnowflakeVariableQuery, options?: any): Promise<MetricFindValue[]> {
    if (!query.queryText) {
      return Promise.resolve([]);
    }
    // We just issue a regular table query.
    return this.query({
      targets: [
        {
          queryText: query.queryText,
          queryType: 'table',
          timeColumns: [] as string[],
          refId: 'A', // dummy refId.
        },
      ],
      maxDataPoints: 0, // No max datapoints!
    } as DataQueryRequest<SnowflakeQuery>)
      .pipe(
        switchMap((response) => {
          if (response.error) {
            console.log('Error: ' + response.error.message);
          }
          return response.data;
        }),
        switchMap((data: DataFrame) => {
          return data.fields;
        }),
        map((field) =>
          field.values.toArray().map((value) => {
            return { text: value };
          })
        )
      )
      .toPromise();
  }
}
