// directions-api-client.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHandler } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { DirectionsResponse } from '../interfaces/directions';

@Injectable({
  providedIn: 'root'
})
export class DirectionsApiClient extends HttpClient {
  public baseUrl: string = 'https://api.mapbox.com/directions/v5/mapbox/driving';

  constructor(handler: HttpHandler) {
    super(handler);
  }

  public override get<T>(url: string) {
    url = this.baseUrl + url;

    return super.get<T>(url, {
      params: {
        alternatives: true,
        geometries: 'geojson',
        language: 'es',
        overview: 'full',
        steps: true,
        access_token: environment.apiKey
      }
    });
  }

  public getRouteBetweenPoints(start: [number, number], end: [number, number]) {
    return this.get<DirectionsResponse>(`/${start.join(',')};${end.join(',')}`);
  }
  
  public getRouteForMultiplePoints(points: [number, number][]) {
    const coordinates = points.map(point => `${point[0]},${point[1]}`);
    return this.get<DirectionsResponse>(`/${coordinates.join(';')}`);
  }
}
