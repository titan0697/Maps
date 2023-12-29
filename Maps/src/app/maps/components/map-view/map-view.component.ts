import { Component, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { Map, Popup, Marker, LngLatLike } from 'mapbox-gl';
import { MapService, PlacesService } from '../../services';

@Component({
  selector: 'app-map-view',
  templateUrl: './map-view.component.html',
  styleUrls: ['./map-view.component.css']
})
export class MapViewComponent implements AfterViewInit {

  @ViewChild('mapDiv')
  mapDivElement!: ElementRef;

  constructor(
    private placesService: PlacesService,
    private mapService: MapService
  ) { }

  ngAfterViewInit(): void {
    if (!this.placesService.useLocation) throw Error('No hay placesService.userLocation');

    const map = new Map({
      container: this.mapDivElement.nativeElement,
      style: 'mapbox://styles/mapbox/outdoors-v11',
      center: this.placesService.useLocation,
      zoom: 14,
    });

    const popup = new Popup()
      .setHTML(`
        <div style="text-align: center; margin-top: 10px">
          <h5>Ubicación actual</h5>
        </div>
      `);

    const marker = new Marker({ color: 'red', draggable: true })
      .setLngLat(this.placesService.useLocation)
      .setPopup(popup)
      .addTo(map);

      marker.on('dragend', () => {
        const newLocation = marker.getLngLat();
        this.handleMarkerDragEnd(newLocation);
      });
      

    marker.getElement().addEventListener('click', () => {
      // Hacer zoom hasta el punto del marcador
      map.flyTo({
        center: marker.getLngLat(),
        zoom: 16,  // Ajusta el nivel de zoom 
      });
    });

    this.mapService.setMap(map);
  }


  private handleMarkerDragEnd(newLocation: LngLatLike) {
    this.placesService.setUserLocation(this.convertToNumberArray(newLocation));
    this.mapService.updateUserLocation(newLocation);
  }
  

  public convertToNumberArray(location: LngLatLike): [number, number] {
    if ('lng' in location && 'lat' in location) {
      return [location.lng, location.lat];
    }
    // Maneja otros casos según sea necesario
    throw new Error('Invalid location format');
  }
  

  
  
    
}
