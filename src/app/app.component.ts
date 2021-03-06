import { Component } from '@angular/core';
import { FormGroup, FormControl, FormArray, Validators, AbstractControl } from '@angular/forms';
import { FormBuilder } from '@angular/forms';
import { NgVarDirective } from './ng-var.directive';

import { Class, Subject, subjects } from './subjects';

// Formulas are taken from: https://portal.mytum.de/archiv/kompendium_rechtsangelegenheiten/eignungsfeststellungssatzungen/2010-11-EfV-Satzg-BA-Mathe-FINAL-1-04-10.pdf/download 

function string_to_slug (str) {
    str = str.replace(/^\s+|\s+$/g, ''); // trim
    str = str.toLowerCase();

    // remove accents, swap ñ for n, etc
    var from = "àáäâèéëêìíïîòóöôùúüûñç·/_,:;";
    var to   = "aaaaeeeeiiiioooouuuunc------";
    for (var i=0, l=from.length ; i<l ; i++) {
        str = str.replace(new RegExp(from.charAt(i), 'g'), to.charAt(i));
    }

    str = str.replace(/[^a-z0-9 -]/g, '') // remove invalid chars
        .replace(/\s+/g, '-') // collapse whitespace and replace by -
        .replace(/-+/g, '-'); // collapse dashes

    return str;
}


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.sass']
})
export class AppComponent {
  title = 'tumcalc';

  GRADE_POINTS = 1;
  GRADES = 2;
  CUSTOM_SUBJ_STR = "Anderes Studienfach";
  DEFAULT_GPA_WEIGHT = 0.65;
  DEFAULT_SCHOOL_WEIGHT = 0.35;

  randomGPA = (2.5 + Math.random()).toFixed(1).toString().replace('.',','); 

  form: FormGroup;
  gradeValidator = Validators.pattern(/^(0,[5-9]|[1-5],[0-9]|6,0)$/);
  gradePointValidator = Validators.pattern(/^([0-9]|1[0-5])$/);
  gradeInputType = this.GRADE_POINTS; // whether class grades are being entered in grade points or german grades

  infoMsgOpen = true;
  closeInfoMsg() {
    this.infoMsgOpen = false;
  }

  resetPointWeights() {
    this.form.controls.gpaWeight.setValue(this.DEFAULT_GPA_WEIGHT);
    this.form.controls.schoolWeight.setValue(this.DEFAULT_SCHOOL_WEIGHT);
  }
  
  /*
   * Called upon change of selectedSubject.
   * Adds controls to form group to match the classes in the subject.
   * Note:  since this.form.value hasn't yet been updated, form-dependent 
   *        getters like this.selectedSubject can't be relied upon.
   */
  onSubjectChange(selectedSubject) {
    let customSubjectSelected = (selectedSubject == this.CUSTOM_SUBJ_STR 
                                 || selectedSubject.name == this.CUSTOM_SUBJ_STR);
    if (customSubjectSelected) {
      selectedSubject = this.customSubject;
    } else {
      this.resetPointWeights();
    }

    let gradesFormGroup = <FormGroup>this.form.get('grades');

    if (customSubjectSelected) {
      // Remove unwanted controls (classes not part of selectedSubject)
      for (let fgName in gradesFormGroup.controls) {
        let classNotInSubject = selectedSubject.classes.every((c, i) => 
                                                       this.classFormGroupName(c.name, i) != fgName);
        if (classNotInSubject) {
          gradesFormGroup.removeControl(fgName);
        }
      }
    } else {
      // Remove all controls
      this.form.removeControl('grades');
      this.form.addControl('grades', this.fb.group({}));
    }

    // Add new controls with correct Validator
    let validator = (this.gradeInputType == this.GRADE_POINTS ? this.gradePointValidator : this.gradeValidator);

    let classBuilderObject = { 
      'grade': [null, validator],
      'factor': customSubjectSelected ? [1] : undefined 
    }; // builder for single class

    for (let [i, _class] of selectedSubject.classes.entries()) {
      let fgName = this.classFormGroupName(_class.name, i);
      if (!(fgName in gradesFormGroup.controls)) {
        let control = this.fb.group(classBuilderObject);
        gradesFormGroup.addControl(fgName, control);
      }
    }

    this.form.setControl('grades', gradesFormGroup);
  }

  /*
   * Converts German grade points (0-16)
   * to points in the TUM system (0-100)
   */
  gradePointsToPoints(gp) {
    return 10 + 6 * gp;
  }

  /*
   * Returns string containing formula
   * by which points for a class with given 
   * grade input and factor would be calculated 
   * considering current value of this.gradeInputType.
   */
  classPointsFormula(gradeInput, factor) {
    return `(${this.pointsFormula(gradeInput, this.gradeInputType)}) * ${factor}`;
  }

  /*
   * Returns string containing 
   * formula by which a grade for school classes (n) 
   * would currently be converted to TUM points.
   * @param (number) gradeInputType - whether to return formula for grade points or grades.
   */
  pointsFormula(n, gradeInputType) {
    if (gradeInputType == this.GRADE_POINTS) {
      return `10 + 6 * ${n}`;
    } else if (gradeInputType == this.GRADES) {
      return `120 - 20 * ${n}`;
    }
  }

  // Unordered array of grade inputs
  get gradesInputArray(): number[] {
    return this.selectedSubject?.classes.map(
          (c, i) => this.classPoints(c.name, i) 
        ).filter(p => p != null)
  }

  weightedSpFormula() {
    let sum = this.gradesInputArray.join(' + ');
    let factors = [];
    for (let [i, c] of this.selectedSubject.classes.entries()) {
      if (this.getGradeControl(c.name, i).valid 
         && this.classPoints(c.name, i)) {
           factors.push(c.factor);
      }     
    }

    return `(${sum}) / (${factors.join(' + ')})`;
  }

  /*
   * Converts German grade (1-6)
   * to points in the TUM system (0-100)
   */
  gradeToPoints(g) {
    if (!g || this.gradeValidator(g) != null) return null;

    g = this.gradeToFloat(g);
    if (g > 6 || g < 0.5) {
      throw Error(`Grade must be between 0.5 and 6.0. Is ${g}`); 
    }

    let p = 120 - 20 * g;
    return p > 100 ? 100 : p;
  }

  // Converts grade String ('x,x') to float (x.x).
  gradeToFloat(g) {
    if (typeof(g) === 'number') return g.toFixed(1);
    return parseFloat(g.replace(',', '.')).toFixed(1);
  }

  get gpa(): number {
    if (this.form.get('gpa').valid) {
      return this.form.value.gpa;
    } else {
      return null;
    }
  }

  /*
   * Returns grade input for class.
   */
  getGradeInput(className: string, classIndex: number) {
    let fgName = this.classFormGroupName(className, classIndex);
    return this.getGradeControl(className, classIndex)?.valid 
      ? this.form.value.grades[fgName].grade : null;
  }

  getGradeControl(className: string, classIndex: number) {
    if (!className) throw Error(`Class name missing`);
    let fgName = this.classFormGroupName(className, classIndex);
    return this.form.controls.grades.get(fgName).get('grade');
  }

  /*
   * Looks up grade input for class 
   * and returns points for it mult. by its factor.
   */
   classPoints(className: string, classIndex: number) {
    let gradeInput = this.getGradeInput(className, classIndex);

    let _class = this.selectedSubject.classes.find( c => {
      return c.name === className
    });
    let factor = this.customSubjectSelected ? 
      this.customClassFactor(className, classIndex) : _class.factor;

    if (!gradeInput) {
      return null;
    } else {
      return this.gradePointsToPoints(gradeInput) * 
        factor;
    }
   }

  customClassFactor(className: string, classIndex: number) {
    let fgName = this.classFormGroupName(className, classIndex);
    return this.form.value.grades[fgName].factor;
  }

  classFormGroupName(className: string, classIndex: number) {
    return `grades-${string_to_slug(className)}-${classIndex}`;
  }

  // Separates given array by commas, adds 'and' before last el.
  commaSep(arr: string[]) {
    if (arr.length > 1) {
      let last = arr.pop();
      return `${arr.join(', ') + (arr.length > 2 ? ',' : '')} und ${last}`;
    } else {
      return arr.join();
    }
  }

  /* Sum of grades div. by sum of class mult. factors
   * Source: §5 (2) in each src. pdf 
   */
  get weightedSchoolPoints(): number {
    let schoolPoints = 0; // points gained from last 4 semesters of school
    let factorSum = 0; // sum of classes weight factors 
    for (let [i, _class] of this.selectedSubject?.classes.entries()) {
      let classPoints = this.classPoints(_class.name, i);
      let factor = this.customSubjectSelected ? 
        this.customClassFactor(_class.name, i) : _class.factor;

      if (classPoints) {
        // If input for this class present, add to sum  
        schoolPoints += classPoints;
        factorSum += factor; 
      }
    }
    return Math.ceil(schoolPoints / factorSum) || 0; 
  }

  get gpaPoints(): number {
    return this.gradeToPoints(this.gpa);
  }

  get totalPoints() : number {
    if (this.form.invalid) return null;

    return Math.ceil(this.form.value.gpaWeight * this.gpaPoints + this.form.value.schoolWeight * this.weightedSchoolPoints);
  }

  get passingByScore(): boolean {
    return this.totalPoints >= this.form.value.selectedSubject.passingScore;
  }
  get passingBySubjects(): boolean {
    return this.selectedSubject.classes.every((c, i) => 
                       !c.critical || this.getGradeInput(c.name, i)); 
  }
  get passing(): boolean {
    return this.passingBySubjects && this.passingByScore;
  }

  // Returns either a custom or a pre-defined subject based on user selection
  get selectedSubject(): Subject {
    let sel = this.form.value.selectedSubject;
    if (sel == this.CUSTOM_SUBJ_STR) {
      sel = this.customSubject;
    }
    return sel;
  }

  customClasses: Class[] = [];
  // Constructs a Subject based on user input
  get customSubject(): Subject {
    return {
       name: this.CUSTOM_SUBJ_STR,
       classes: this.customClasses
    };
  }

  get customSubjectSelected(): boolean {
    return this.form.value.selectedSubject == this.CUSTOM_SUBJ_STR;
  }

  addCustomClass() {
    let classNum = this.customClasses.length + 1;
    this.customClasses.push({ name: `${classNum}. Fach` });
    this.onSubjectChange(this.customSubject);
  }

  // Returns critical classes for which a grade is missing
  get missingClasses(): string[] {
    return this.selectedSubject.classes.filter(
      (c, i) => c.critical && !this.getGradeInput(c.name, i)
    ).map(c => c.name);
  }

  ngOnInit() {
    this.form = this.fb.group({
      selectedSubject: [subjects[0] || {}],
      grades: this.fb.group({}),
      gpa: ['', [
        Validators.required,
        this.gradeValidator
      ]],
      gpaWeight: [this.DEFAULT_GPA_WEIGHT],
      schoolWeight: [this.DEFAULT_SCHOOL_WEIGHT]
    });

    this.onSubjectChange(this.form.value.selectedSubject);
    this.form.get('selectedSubject').valueChanges.subscribe(this.onSubjectChange.bind(this));
  }

  subjects = subjects;

  constructor(private fb: FormBuilder) { }
  
}
