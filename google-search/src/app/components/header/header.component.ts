import { Component } from '@angular/core';
import { AuthService } from 'src/app/shared/services/auth.service';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent {
  constructor( public authService: AuthService){ console.log('header') }

  isLoggedIn(){
    console.log(this.authService.isLoggedIn)
     return !this.authService.isLoggedIn
  }
}
