import { Injectable, OnDestroy } from '@angular/core';
import { GeoJSONSourceRaw, LngLatBounds, LngLatLike, Map, Marker, Popup } from 'mapbox-gl';
import { Feature } from '../interfaces/places';
import { DirectionsApiClient } from '../api';
import { DirectionsResponse, Route } from '../interfaces/directions';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class MapService implements OnDestroy {
  private map?: Map;
  private markers: Marker[] = [];
  private watchPositionId: number | null = null;
  private destinationLocation: [number, number] | null = null;

  get isMapReady() {
    return !!this.map;
  }

  constructor(private directionsApi: DirectionsApiClient) { }

  ngOnDestroy(): void {
    if (this.watchPositionId !== null) {
      navigator.geolocation.clearWatch(this.watchPositionId);
      this.watchPositionId = null;
    }
  }

  setMap(map: Map) {
    this.map = map;
  }

  flyTo(coords: LngLatLike) {
    if (!this.isMapReady) {
      console.error('El mapa no está inicializado');
      return;
    }

    this.map?.flyTo({
      zoom: 16,
      center: coords
    });
  }

  private userLocationSubscription: any;
  startTrackingUserLocation() {
    if (!navigator.geolocation) {
      console.error('Geolocation is not supported by your browser');
      return;
    }


    // Suscribirse a cambios en la ubicación del usuario
    this.userLocationSubscription = navigator.geolocation.watchPosition(
      (position) => {
        const userLocation: [number, number] = [position.coords.longitude, position.coords.latitude];
        this.updateAndFlyTo(userLocation);

        // Obtener la ruta actualizada entre la ubicación del usuario y el destino deseado
        if (this.destinationLocation) {
          this.updateRoute(userLocation, this.destinationLocation);
        }
      },
      (error) => console.error('Error getting user location:', error),
      { enableHighAccuracy: true }
    );
  }


  stopTrackingUserLocation() {
    if (this.userLocationSubscription) {
      // Desuscribirse cuando el componente se destruye o se deja de rastrear la ubicación
      this.userLocationSubscription.unsubscribe();
    }
  }

  // Observador para la ubicación del usuario
  private userLocationSubject = new Subject<LngLatLike>();

  // Observable expuesto para la ubicación del usuario
  public userLocation$ = this.userLocationSubject.asObservable();

  // Método para actualizar y volar a la nueva ubicación
  // Llamada en updateAndFlyTo
  public updateAndFlyTo(newLocation: LngLatLike) {
    this.updateUserLocation(newLocation);
    this.flyTo(newLocation);

    const destination = this.getDestinationLocation();
    if (destination) {
      const newLocationArray = this.convertToNumberArray(newLocation);
      this.directionsApi.get<DirectionsResponse>(`/${newLocationArray[0]},${newLocationArray[1]};${destination[0]},${destination[1]}`)
        .subscribe(resp => {
          const route = resp.routes[0];
          const originalCoords = route.geometry.coordinates as [number, number][];
          this.drawPolyline(originalCoords);
        });
    }
  }


  public convertToNumberArray(location: LngLatLike): [number, number] {
    if ('lng' in location && 'lat' in location) {
      return [location.lng, location.lat];
    }
    // Maneja otros casos según sea necesario
    throw new Error('Invalid location format');
  }


  // Método para actualizar la ubicación del usuario
  public updateUserLocation(newLocation: LngLatLike) {
    if (this.isMapReady) {
      this.flyTo(newLocation);
      this.userLocationSubject.next(newLocation); // Emitir nueva ubicación
    }
  }

  createMarkersFromPlaces(places: Feature[], userLocation: [number, number]) {
    if (!this.map) {
      console.error('Mapa no inicializado');
      return;
    }

    this.markers.forEach(marker => marker.remove());
    const newMarkers: Marker[] = [];

    for (const place of places) {
      const [lng, lat] = place.center;
      const popup = new Popup()
        .setHTML(`
          <h6>${place.text}</h6>
          <span>${place.place_name}</span>
        `);

      const newMarker = new Marker()
        .setLngLat([lng, lat])
        .setPopup(popup)
        .addTo(this.map);

      newMarkers.push(newMarker);
    }

    this.markers = newMarkers;

    if (places.length === 0) return;

    // Limites del mapa
    const bounds = new LngLatBounds();
    newMarkers.forEach(marker => bounds.extend(marker.getLngLat()));
    bounds.extend(userLocation);

    this.map.fitBounds(bounds, {
      padding: 200
    });
  }

  getRouteBetweenPoints(start: [number, number], end: [number, number]) {
    this.directionsApi.get<DirectionsResponse>(`/${start.join(',')};${end.join(',')}`)
      .subscribe(resp => {
        const route = resp.routes[0];
        this.drawPolyline(route.geometry.coordinates);
      });
  }


  public updateRoute(userLocation: LngLatLike, destination: LngLatLike) {
    const extractCoords = (coords: LngLatLike): [number, number] => {
      if (Array.isArray(coords)) {
        return coords as [number, number];
      } else if ('lng' in coords && 'lat' in coords) {
        return [coords.lng, coords.lat];
      } else if ('lon' in coords && 'lat' in coords) {
        return [coords.lon, coords.lat];
      } else {
        throw new Error('Invalid coordinate format');
      }
    };

    const userCoords = extractCoords(userLocation);
    const destinationCoords = destination ? extractCoords(destination) : null;

    if (userCoords && destinationCoords) {
      this.directionsApi.get<DirectionsResponse>(`/${userCoords.join(',')};${destinationCoords.join(',')}`)
        .subscribe(resp => {
          // Asumiendo que hay al menos una ruta en la respuesta
          const route = resp.routes[0];
          const originalCoords = route.geometry.coordinates as [number, number][];

          // Actualiza la línea existente con las nuevas coordenadas
          this.drawPolyline(originalCoords);
        });
    }
  }

  private drawPolyline(coordinates: number[][] | [number, number][]) {
    if (!this.map) {
      console.error('Mapa no inicializado');
      return;
    }

    const bounds = new LngLatBounds();
    coordinates.forEach((coord: number[] | [number, number]) => {
      const lngLat: [number, number] = Array.isArray(coord) ? [coord[0], coord[1]] : coord;
      bounds.extend(lngLat);
    });

    if (this.map) {
      this.map.fitBounds(bounds, {
        padding: 200
      });

      const source = this.map.getSource('RouteString') as mapboxgl.GeoJSONSource;
      if (source) {
        source.setData({
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'LineString',
                coordinates: coordinates as [number, number][]
              }
            }
          ]
        });
      } else {
        // Crea la fuente y la capa si no existen
        this.map.addSource('RouteString', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: [
              {
                type: 'Feature',
                properties: {},
                geometry: {
                  type: 'LineString',
                  coordinates: coordinates
                }
              }
            ]
          }
        });

        this.map.addLayer({
          id: 'RouteString',
          type: 'line',
          source: 'RouteString',
          layout: {
            'line-cap': 'round',
            'line-join': 'round'
          },
          paint: {
            'line-color': 'black',
            'line-width': 3
          }
        });
      }
    }
  }

  updateDestinationLocation(destination: [number, number]) {
    this.destinationLocation = destination;
  }

  private getUserLocation(): Promise<[number, number] | null> {
    return new Promise((resolve, reject) => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const userLocation: [number, number] = [position.coords.longitude, position.coords.latitude];
            resolve(userLocation);
          },
          (error) => {
            console.error('Error getting user location:', error);
            resolve(null);
          },
          { enableHighAccuracy: true }
        );
      } else {
        console.error('Geolocation is not supported by your browser');
        resolve(null);
      }
    });
  }

  public getDestinationLocation(): [number, number] | null {
    return this.destinationLocation;
  }

}
