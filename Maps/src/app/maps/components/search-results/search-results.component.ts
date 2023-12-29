import { Component } from '@angular/core'; 
import { MapService, PlacesService } from '../../services'; 
import { Feature } from '../../interfaces/places'; 
 
@Component({ 
  selector: 'app-search-results', 
  templateUrl: './search-results.component.html', 
  styleUrls: ['./search-results.component.css'] 
}) 
export class SearchResultsComponent { 
 
  public selectedId = ''; 
 
  constructor(  
    private placesService: PlacesService, 
    private mapService: MapService, 
  ) { } 
 
  get isLoadingPlaces(): boolean { 
    return this.placesService.isLoadingPlaces; 
  } 
  
  get places(): Feature[] { 
    return this.placesService.places; 
  } 
 
  flyTo(place: Feature): void { 
    this.selectedId = place.id; 
 
    const [lng, lat] = place.center; 
    this.mapService.flyTo([lng, lat]); 
  } 
 
  getDirections(place: Feature): void { 
    if (!this.placesService.useLocation) { 
      throw new Error('No hay userLocation'); 
    } 
 
    this.placesService.deletePlaces(); 
 
    const start = this.placesService.useLocation; 
    const end = place.center as [number, number]; 
 
    this.mapService.getRouteBetweenPoints(start, end); 
  } 
} 
 