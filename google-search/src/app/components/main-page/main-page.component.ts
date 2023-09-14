import { HttpHeaders } from '@angular/common/http';
import { AfterViewInit, Component, OnInit, ViewChild} from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort, Sort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { Observable, forkJoin, never } from 'rxjs';
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
export class MainPageComponent implements OnInit, AfterViewInit  {
  tableData = [] as {date: string , data: { key: string; clicks: number }[]}[];
  displayedColumns: string[] = [];
  keyColumns:string[] = []
  
  combinedDataConcat:any = [];
  
  response:any
  constructor(public dialog: MatDialog,
    public authService: AuthService,
  ) {}

  isLoggedIn(){
     return !this.authService.isLoggedIn
  }

  dataSource = new MatTableDataSource<PeriodicElement>();

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;

  ngOnInit(){

    const result = JSON.parse(localStorage.getItem('result')!)
    const currentDate = new Date();
    const lastThreeMonthsData: Observable<any>[] = [];

    for (let i = 0; i < 90; i += 4) {
      // Вычислить начальную и конечную даты для каждого периода (4 дня)
      const endDate = currentDate.toISOString().split('T')[0];
      currentDate.setDate(currentDate.getDate() - 4);
      const startDate = currentDate.toISOString().split('T')[0];

      // Отправить запрос для текущего периода и добавить его в массив запросов
      const dataForPeriod$ = this.fetchDataForPeriod(result, startDate, endDate, ["query", "date"], 15);

      lastThreeMonthsData.push(dataForPeriod$);
    }

    // Использовать forkJoin для отправки всех запросов параллельно
    forkJoin(lastThreeMonthsData).subscribe(
      (responses) => {
        // Обработка данных из ответов (responses)
        const combinedData:any = [];
        responses.forEach(response => {
          if (response && response.rows) {
            const periodData = response.rows.map((row: any) => ({
              key: row.keys[0],
              date: row.keys[1],
              clicks: row.clicks,
              impressions: row.impressions,
              position: row.position
            }));
            combinedData.push(...periodData); // Объединяем данные
          }
        });
        combinedData.sort((a:any, b:any) => new Date(b.date).getTime() - new Date(a.date).getTime());
        this.transformData(combinedData)

        this.dataSource = new MatTableDataSource(combinedData);
  
        this.displayedColumns = Object.keys(this.tableData[0]).filter(key => key !== "key");
        this.keyColumns = ['key', ...this.displayedColumns];

        console.log(this.displayedColumns)
        this.dataSource = new MatTableDataSource<PeriodicElement>(combinedData);

      },
      (error) => {
        // Обработка ошибок
        console.error('Произошла ошибка при выполнении запросов:', error);
      }
    );
  }

  // Функция для отправки запроса на получение данных за определенный период
  fetchDataForPeriod(accessToken: any, startDate: string, endDate: string, dimensions: string[], rowLimit: number): Observable<any> {
    const headers = new HttpHeaders({
      Authorization: `Bearer ${accessToken.credential.accessToken}`,
      'Content-Type': 'application/json',
    });

    const body = {
      startDate,
      endDate,
      dimensions,
      rowLimit,
      metrics: "clicks"
    };
    const result = JSON.parse(localStorage.getItem('result')!)

    return this.authService.fetchData(result, startDate, endDate, ["query", "date"], 15);
  }

  ngAfterViewInit() {
    this.dataSource.sort = this.sort;
    this.dataSource.paginator = this.paginator;
  }

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
  
  sortByDate(data: any[]) {
    data.sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);

        return dateA.getTime() - dateB.getTime();
    });
  }

  transformData(data: any[]): void {
    const dates = Array.from(new Set(data.map(item => item.date)));
    const transformedData:any = {};

    // Инициализация данных для всех дат
    data.forEach(item => {
      if (!transformedData[item.key]) {
        transformedData[item.key] = {};
      }
      dates.forEach(date => {
        transformedData[item.key][date] = '0';
      });
    });

    // Заполнение данных из исходных данных
    data.forEach(item => {
      transformedData[item.key][item.date] = Math.round(item.position.toString());
    });

    // Преобразование данных в желаемый формат
    const result = Object.keys(transformedData).map(key => {
      const obj:any = { key };
      dates.forEach(date => {
        obj[date] = transformedData[key][date];
      });
      return obj;
    });

    console.log(result)
    this.tableData = result
  }
}

