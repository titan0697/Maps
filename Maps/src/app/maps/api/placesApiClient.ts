import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class PlacesApiClient {

  private readonly baseUrl: string = 'https://api.mapbox.com/geocoding/v5/mapbox.places';

  constructor(private httpClient: HttpClient) {}

  public get<T>(url: string, options: {
    params?: { [param: string]: string | number | boolean | (string | number | boolean)[] };
  }): Observable<T> {
    const defaultParams = new HttpParams()
      .set('limit', '5')
      .set('language', 'es')
      .set('access_token', environment.apiKey);

    const mergedParams = options.params ? defaultParams.appendAll(options.params || {}) : defaultParams;

    return this.httpClient.get<T>(`${this.baseUrl}${url}`, { params: mergedParams });
  }
}
