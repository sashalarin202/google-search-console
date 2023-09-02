import { Component } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { AuthService } from 'src/app/shared/services/auth.service';

@Component({
  selector: 'app-main-page',
  templateUrl: './main-page.component.html',
  styleUrls: ['./main-page.component.scss']
})
export class MainPageComponent {
  constructor(public dialog: MatDialog, public authService: AuthService,) {}

  isLoggedIn(){
    console.log(this.authService.isLoggedIn)
     return !this.authService.isLoggedIn
  }
}

