import { LiveAnnouncer } from '@angular/cdk/a11y';
import {AfterViewInit, Component, OnInit, ViewChild} from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort, MatSortModule, Sort } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { AuthService } from 'src/app/shared/services/auth.service';



export interface PeriodicElement {
  key: string;
  clicks: number;
  impressions: number;
  position: number;
}

@Component({
  selector: 'app-main-page',
  templateUrl: './main-page.component.html',
  styleUrls: ['./main-page.component.scss'],
})
export class MainPageComponent implements OnInit {
  
  response:any
  constructor(public dialog: MatDialog,
    public authService: AuthService,
    private _liveAnnouncer: LiveAnnouncer
  ) {}

  isLoggedIn(){
     return !this.authService.isLoggedIn
  }
  displayedColumns: string[] = ['key', 'clicks', 'impressions', 'position'];

  dataSource = new MatTableDataSource();

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;

  ngOnInit(){
    const result = JSON.parse(localStorage.getItem('result')!)
    this.authService.fetchData(result, '2023-06-07','2023-09-07', ['PAGE'], 100).subscribe(
      (response) => {
        // Обработка данных из ответа
        this.response = response.rows.map((row: any) => ({
          key: row.keys[0], // Преобразуем массив в строку
          clicks: row.clicks,
          impressions: row.impressions,
          position: row.position
        }));
        console.log(this.response)
        this.dataSource = new MatTableDataSource(this.response);
      },
      (error) => {
        // Обработка ошибок
        console.error('Произошла ошибка при выполнении запроса:', error);
      }
    )
  }

  ngAfterViewInit() {
    this.dataSource.sort = this.sort;
    this.dataSource.paginator = this.paginator;
  }

  /** Announce the change in sort state for assistive technology. */
  announceSortChange(sortState: Sort) {
    const data = [...this.response]; // Копия данных
  if (sortState.direction) {
    data.sort((a, b) => {
      const isAsc = sortState.direction === 'asc';
      if (sortState.active === 'key') {
        return (a.key.localeCompare(b.key)) * (isAsc ? 1 : -1);
      } else if (sortState.active === 'clicks') {
        return (a.clicks - b.clicks) * (isAsc ? 1 : -1);
      } else if (sortState.active === 'impressions') {
        return (a.impressions - b.impressions) * (isAsc ? 1 : -1);
      } else if (sortState.active === 'position') {
        return (a.position - b.position) * (isAsc ? 1 : -1);
      }
      return 0;
    });
  }

  this.dataSource = new MatTableDataSource(data);
  }
  
}

