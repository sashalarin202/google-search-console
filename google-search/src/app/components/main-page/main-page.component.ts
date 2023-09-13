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

    for (let i = 0; i < 2; i += 4) {
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
        console.log(this.tableData)
        // for (const entry of this.tableData) {
        //   const date: string = entry.date;
        //   this.displayedColumns.push(date);
        // }
        this.displayedColumns = this.tableData.map((entry) => entry.date);
        this.dataSource = new MatTableDataSource<PeriodicElement>(combinedData);
        console.log(this.displayedColumns)

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
  transformData(data: any[]): any {
    const groupedData: { [key: string]: { date: string; data: { key: string; clicks: number }[] } } = {};

    data.forEach((entry) => {
      const date = entry.date;
      const key = entry.key;
      const clicks = entry.clicks;

      if (!groupedData[date]) {
        groupedData[date] = { date: date, data: [] };
      }

      const existingEntry = groupedData[date].data.find((item) => item.key === key);
      if (existingEntry) {
        existingEntry.clicks += clicks;
      } else {
        groupedData[date].data.push({ key: key, clicks: clicks });
      }
    });

    const result = Object.values(groupedData);
    const dataResult =  this.combineKeys(result);

    return dataResult
  }

  combineKeys(data: any) {
    const allKeys = new Set<string>();
  
    // Собираем все ключи во всех датах
    data.forEach((entry: any) => {
      entry.data.forEach((item: { key: string; clicks: number }) => {
        allKeys.add(item.key);
      });
    });
  
    this.combinedDataConcat = data.map((entry: any) => {
      const combinedEntry = {
        date: entry.date,
        data: [] as { key: string; clicks: number }[],
      };
  
      allKeys.forEach((key) => {
        const matchingItem = entry.data.find((item:any) => item.key === key);
  
        if (matchingItem) {
          combinedEntry.data.push(matchingItem);
        } else {
          combinedEntry.data.push({ key, clicks: 0 });
        }
      });

      this.tableData.push(combinedEntry)
  
      return combinedEntry;
    });
  }
}

