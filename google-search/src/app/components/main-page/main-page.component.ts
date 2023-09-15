import { HttpHeaders } from '@angular/common/http';
import { AfterViewInit, Component, OnInit, ViewChild} from '@angular/core';
import { FormControl } from '@angular/forms';
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
export class MainPageComponent implements AfterViewInit  {
  counterWeeks: number = 1
  selectedDomen:boolean = false
  selectedDomain: string;
  domenList: string[] = []
  tableData = [] as {date: string , data: { key: string; clicks: number }[]}[];
  displayedColumns: string[] = [];
  keyColumns:string[] = []
  
  combinedDataConcat:any = [];
  
  response:any
  constructor(public dialog: MatDialog,
    public authService: AuthService,
  ) {
    let domenData:any[] = []

    const result = JSON.parse(localStorage.getItem('result')!)


    if (this.authService.isLoggedIn) {
      this.authService.getSearchConsoleDomains(result).subscribe(
        (domains) => {
          // Обработайте полученные данные о доменах
          domenData = domains.siteEntry;
          this.domenList = domenData.map(entry=> entry.siteUrl).map((str) => str.replace("sc-domain:", ""));
          // console.log(this.domenList)
        },
        (error) => {
          // Обработайте ошибку
          console.error('Произошла ошибка при получении доменов:', error);
        }
      );
    }
  }

  isLoggedIn(){
     return !this.authService.isLoggedIn
  }

  dataSource = new MatTableDataSource<PeriodicElement>();

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;


  // Функция для отправки запроса на получение данных за определенный период
  fetchDataForPeriod(accessToken: any, startDate: string, endDate: string, dimensions: string[], rowLimit: number, domen:string): Observable<any> {
    const headers = new HttpHeaders({
      Authorization: `Bearer ${accessToken.credential.accessToken}`,
      'Content-Type': 'application/json',
    });

    const body = {
      startDate,
      endDate,
      dimensions,
      rowLimit,
      metrics: "position"
    };
    const result = JSON.parse(localStorage.getItem('result')!)

    return this.authService.fetchData(result, startDate, endDate, ["query", "date"], rowLimit, domen);
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
    const transformedData: any = {};
  
    // Инициализация данных для всех дат
    data.forEach(item => {
      if (!transformedData[item.key]) {
        transformedData[item.key] = {};
      }
      dates.forEach(date => {
        transformedData[item.key][date] = '-';
      });
    });
  
    // Заполнение данных из исходных данных и вычисление суммы impressions
    data.forEach(item => {
      if (!transformedData[item.key].impressions) {
        transformedData[item.key].impressions = 0;
      }
      transformedData[item.key][item.date] = Math.round(item.position.toString());
      transformedData[item.key].impressions += item.impressions;
    });
  
    // Преобразование данных в желаемый формат
    const result = Object.keys(transformedData).map(key => {
      const obj: any = { key };
      dates.forEach(date => {
        obj[date] = transformedData[key][date];
      });
      obj.impressions = transformedData[key].impressions; // Добавление суммы impressions
      return obj;
    });
  
    // Сортировка данных по убыванию impressions
    result.sort((a, b) => b.impressions - a.impressions);
  
    // console.log(result);
    this.tableData = result;
  }

  selectDomen(domen:any){
    this.selectedDomen = true
    this.tableData = []
    // console.log(domen.value)
    const result = JSON.parse(localStorage.getItem('result')!)
    const currentDate = new Date();
    const lastThreeMonthsData: Observable<any>[] = [];

    for (let i = 0; i < 11; i += 1) {
      const endDate = currentDate.toISOString().split('T')[0];
      currentDate.setDate(currentDate.getDate() - 1);
      const startDate = currentDate.toISOString().split('T')[0];
      console.log("startDate",startDate,"endDate",endDate)

      const dataForPeriod$ = this.fetchDataForPeriod(result, startDate, endDate, ["query", "date"], 10000, domen.value);

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
  
        this.displayedColumns = Object.keys(this.tableData[0]).filter(key => key !== "key" && key !== "impressions");
        this.keyColumns = ['key','impressions', ...this.displayedColumns];

        console.log(this.displayedColumns)
        this.dataSource = new MatTableDataSource<PeriodicElement>(combinedData);

      },
      (error) => {
        // Обработка ошибок
        console.error('Произошла ошибка при выполнении запросов:', error);
      }
    );
    this.selectedDomen = false
  }

  fetchNext10DaysData(domen: string) {
    
    console.log(this.counterWeeks)
    this.selectedDomen = true
    this.tableData = []
    const result = JSON.parse(localStorage.getItem('result')!)
    const currentDate = new Date();
    currentDate.setDate(currentDate.getDate() - 10*this.counterWeeks - 2);
    const lastThreeMonthsData: Observable<any>[] = [];

    for (let i = 0; i < 10; i += 1) {
      const endDate = currentDate.toISOString().split('T')[0];
      currentDate.setDate(currentDate.getDate() - 1);
      const startDate = currentDate.toISOString().split('T')[0];
      console.log("startDate",startDate,"endDate",endDate)

      const dataForPeriod$ = this.fetchDataForPeriod(result, startDate, endDate, ["query", "date"], 10000, domen);

      lastThreeMonthsData.push(dataForPeriod$);
    }
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
  
        this.displayedColumns = Object.keys(this.tableData[0]).filter(key => key !== "key" && key !== "impressions");
        this.keyColumns = ['key','impressions', ...this.displayedColumns];

        console.log(this.displayedColumns)
        this.dataSource = new MatTableDataSource<PeriodicElement>(combinedData);

      },
      (error) => {
        // Обработка ошибок
        console.error('Произошла ошибка при выполнении запросов:', error);
      }
    );
    this.selectedDomen = false
    this.counterWeeks = this.counterWeeks + 1;
  }
  // Метод для получения данных за предыдущие 10 дней
  fetchPrevious10DaysData(domen: string) {

    console.log(this.counterWeeks)
    this.selectedDomen = true
    this.tableData = []
    // console.log(domen.value)
    const result = JSON.parse(localStorage.getItem('result')!)
    const currentDate = new Date();
    if(this.counterWeeks!==2){
      currentDate.setDate(currentDate.getDate() - 10*this.counterWeeks - 2);
    }
    const lastThreeMonthsData: Observable<any>[] = [];

    for (let i = 0; i < 10; i += 1) {
      const endDate = currentDate.toISOString().split('T')[0];
      currentDate.setDate(currentDate.getDate() - 1);
      const startDate = currentDate.toISOString().split('T')[0];
      console.log("startDate",startDate,"endDate",endDate)

      const dataForPeriod$ = this.fetchDataForPeriod(result, startDate, endDate, ["query", "date"], 10000, domen);

      lastThreeMonthsData.push(dataForPeriod$);
    }
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
  
        this.displayedColumns = Object.keys(this.tableData[0]).filter(key => key !== "key" && key !== "impressions");
        this.keyColumns = ['key','impressions', ...this.displayedColumns];

        console.log(this.displayedColumns)
        this.dataSource = new MatTableDataSource<PeriodicElement>(combinedData);

      },
      (error) => {
        // Обработка ошибок
        console.error('Произошла ошибка при выполнении запросов:', error);
      }
    );
    this.selectedDomen = false
    this.counterWeeks = this.counterWeeks - 1
  }
}

