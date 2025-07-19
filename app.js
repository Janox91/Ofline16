// --- Códigos de la planilla mensual ---
const PLANILLA_CODES = [
    { code: 'G', label: 'Guardia Fija', colorClass: 'planilla-G' },
    { code: 'gr', label: 'Guardia Rotativa', colorClass: 'planilla-gr' },
    { code: 'CM', label: 'Carpeta Médica', colorClass: 'planilla-CM' },
    { code: '28', label: 'Ausente', colorClass: 'planilla-28' },
    { code: 'V', label: 'Vacaciones', colorClass: 'planilla-V' },
    { code: 'CP', label: 'Compensatorios', colorClass: 'planilla-CP' },
    { code: 'EST', label: 'Estrés', colorClass: 'planilla-EST' },
    { code: 'CG', label: 'Cambios de Guardia', colorClass: 'planilla-CG' },
    { code: 'A26', label: 'Artículo 26', colorClass: 'planilla-A26' }
];

// --- Chart.js: Gráfica de asistencia mensual ---
function renderAsistenciaChart(employees, attendance) {
    if (!window.Chart) return;
    const ctx = document.getElementById('asistenciaChart');
    if (!ctx) return;
    // Calcular totales del mes actual
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const daysInMonth = new Date(year, month, 0).getDate();
    const statusKeys = ['presente','ausente','vacaciones','llegada-tarde','carpeta-medica','cambio-guardia','estres'];
    const statusLabels = ['Presente','Ausente','Vacaciones','Llegada Tarde','Carpeta Médica','Cambio Guardia','Estrés'];
    const statusColors = [
        '#2e7d32','#c62828','#1976d2','#f9a825','#c2185b','#7b1fa2','#f57c00'
    ];
    const totals = Array(statusKeys.length).fill(0);
    employees.forEach(emp => {
        for(let d=1; d<=daysInMonth; d++){
            const dateStr = `${year}-${month}-${d.toString().padStart(2,'0')}`;
            // CORREGIDO: buscar por clave combinada
            const rec = attendance[`${emp.id}_${dateStr}`];
            if(rec){
                const idx = statusKeys.indexOf(rec.status);
                if(idx>=0) totals[idx]++;
            }
        }
    });
    // Destruir gráfico anterior si existe
    if(window._asistenciaChart) window._asistenciaChart.destroy();
    window._asistenciaChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: statusLabels,
            datasets: [{
                label: 'Registros',
                data: totals,
                backgroundColor: statusColors,
                borderColor: statusColors,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false },
                title: { display: false }
            },
            scales: {
                y: { beginAtZero: true, ticks: { precision:0 } }
            }
        }
    });
}

// --- Porcentaje de asistencia por empleado y por turno ---
function renderAsistenciaPorcentajes(employees, attendance) {
    const empleadoDiv = document.getElementById('asistenciaPorEmpleado');
    const turnoDiv = document.getElementById('asistenciaPorTurno');
    if (!empleadoDiv || !turnoDiv) return;
    // Mes actual
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const daysInMonth = new Date(year, month, 0).getDate();
    // Por empleado
    let htmlEmp = '<table style="width:100%;border-collapse:collapse;font-size:0.95em;"><thead><tr><th style="text-align:left;padding:0.3em 0.7em;">Empleado</th><th style="text-align:center;padding:0.3em 0.7em;">Turno</th><th style="text-align:center;padding:0.3em 0.7em;">% Asistencia</th></tr></thead><tbody>';
    employees.forEach(emp => {
        let presentes = 0;
        for(let d=1; d<=daysInMonth; d++){
            const dateStr = `${year}-${month}-${d.toString().padStart(2,'0')}`;
            // CORREGIDO: buscar por clave combinada
            const rec = attendance[`${emp.id}_${dateStr}`];
            if(rec && rec.status === 'presente') presentes++;
        }
        const porcentaje = daysInMonth > 0 ? Math.round((presentes/daysInMonth)*100) : 0;
        htmlEmp += `<tr><td style='padding:0.3em 0.7em;'>${emp.name}</td><td style='padding:0.3em 0.7em;text-align:center;'>${emp.turno||'-'}</td><td style='padding:0.3em 0.7em;text-align:center;'>${porcentaje}%</td></tr>`;
    });
    htmlEmp += '</tbody></table>';
    empleadoDiv.innerHTML = htmlEmp;
    // Por turno
    const turnos = ['Día','Tarde','Noche','SADOFE'];
    let htmlTurno = '<table style="width:100%;border-collapse:collapse;font-size:0.95em;"><thead><tr><th style="text-align:left;padding:0.3em 0.7em;">Turno</th><th style="text-align:center;padding:0.3em 0.7em;">% Asistencia</th></tr></thead><tbody>';
    turnos.forEach(turno => {
        const empleadosTurno = employees.filter(e => e.turno === turno);
        let totalPresentes = 0;
        let totalPosibles = empleadosTurno.length * daysInMonth;
        empleadosTurno.forEach(emp => {
            for(let d=1; d<=daysInMonth; d++){
                const dateStr = `${year}-${month}-${d.toString().padStart(2,'0')}`;
                // CORREGIDO: buscar por clave combinada
                const rec = attendance[`${emp.id}_${dateStr}`];
                if(rec && rec.status === 'presente') totalPresentes++;
            }
        });
        const porcentaje = totalPosibles > 0 ? Math.round((totalPresentes/totalPosibles)*100) : 0;
        htmlTurno += `<tr><td style='padding:0.3em 0.7em;'>${turno}</td><td style='padding:0.3em 0.7em;text-align:center;'>${porcentaje}%</td></tr>`;
    });
    htmlTurno += '</tbody></table>';
    turnoDiv.innerHTML = htmlTurno;
}

// Aplicación de Control de Vigilancia
class VigilanciaApp {
    constructor() {
        this.employees = this.loadFromStorage('employees') || [];
        this.attendance = this.loadFromStorage('attendance') || {};
        this.currentView = 'dashboard';
        this.editingEmployeeId = null;
        // Variables para gestos táctiles
        this.startX = 0;
        this.startY = 0;
        this.endX = 0;
        this.endY = 0;
        
        // Configuración de login
        this.isLoggedIn = this.loadFromStorage('isLoggedIn') || false;
        this.loginPassword = 'upa16'; // Contraseña por defecto
        
        this.init();
    }

    init() {
        // Verificar login antes de inicializar
        if (!this.isLoggedIn) {
            this.setupLogin();
            return;
        }
        
        this.setupEventListeners();
        this.setupDateInputs();
        
        // Inicializar el reloj inmediatamente
        this.updateCurrentTime();
        
        this.updateDashboard();
        this.renderEmployees();
        this.renderAttendance();
        this.renderPlanillaLeyenda();
        this.renderPlanilla();
        this.setupLibroView();
        this.setupControlView();
        
        // Ocultar pantalla de carga
        const loadingScreen = document.getElementById('appLoading');
        if (loadingScreen) {
            loadingScreen.classList.add('hidden');
            setTimeout(() => loadingScreen.style.display = 'none', 300);
        }

        // Event listeners para cerrar el modal de planilla
        const closeBtn = document.getElementById('closePlanillaModal');
        const modal = document.getElementById('planillaModal');
        if (closeBtn && modal) {
            closeBtn.onclick = (e) => {
                modal.style.display = 'none';
            };
            // Cerrar al hacer click fuera del contenido
            modal.onclick = (e) => {
                if (e.target === modal) modal.style.display = 'none';
            };
        }

        // Agregar event listeners a las celdas con novedad
        document.querySelectorAll('.planilla-novedad-cell').forEach(cell => {
            cell.addEventListener('click', (e) => {
                const emp = cell.getAttribute('data-employee');
                const date = cell.getAttribute('data-date');
                const status = cell.getAttribute('data-status');
                const obs = cell.getAttribute('data-obs');
                this.showPlanillaModal(emp, date, status, obs);
            });
        });
    }

    setupLogin() {
        const loginForm = document.getElementById('loginForm');
        const loginPassword = document.getElementById('loginPassword');
        const togglePassword = document.getElementById('togglePassword');
        const loginError = document.getElementById('loginError');
        const loginOverlay = document.getElementById('loginOverlay');

        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin();
            });
        }

        if (togglePassword) {
            togglePassword.addEventListener('click', () => {
                this.togglePasswordVisibility();
            });
        }

        // Permitir login con Enter
        if (loginPassword) {
            loginPassword.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.handleLogin();
                }
            });
        }
    }

    handleLogin() {
        const loginPassword = document.getElementById('loginPassword');
        const loginError = document.getElementById('loginError');
        const loginOverlay = document.getElementById('loginOverlay');

        if (loginPassword && loginPassword.value === this.loginPassword) {
            // Login exitoso
            this.isLoggedIn = true;
            this.saveToStorage('isLoggedIn', true);
            
            // Ocultar overlay de login
            if (loginOverlay) {
                loginOverlay.style.display = 'none';
            }
            
            // Inicializar la aplicación
            this.setupEventListeners();
            this.setupDateInputs();
            
            // Inicializar el reloj inmediatamente
            this.updateCurrentTime();
            
            this.updateDashboard();
            this.renderEmployees();
            this.renderAttendance();
            this.renderPlanillaLeyenda();
            this.renderPlanilla();
            this.setupLibroView();
            this.setupControlView();
            
            // Ocultar pantalla de carga
            const loadingScreen = document.getElementById('appLoading');
            if (loadingScreen) {
                loadingScreen.classList.add('hidden');
                setTimeout(() => loadingScreen.style.display = 'none', 300);
            }
            
            this.showFeedbackMessage('¡Bienvenido al sistema de vigilancia!', 'success');
        } else {
            // Login fallido
            if (loginError) {
                loginError.style.display = 'block';
            }
            if (loginPassword) {
                loginPassword.value = '';
                loginPassword.focus();
            }
        }
    }

    togglePasswordVisibility() {
        const loginPassword = document.getElementById('loginPassword');
        const eyeIcon = document.getElementById('eyeIcon');
        const eyeOpen = document.getElementById('eyeOpen');

        if (loginPassword && eyeIcon && eyeOpen) {
            if (loginPassword.type === 'password') {
                loginPassword.type = 'text';
                eyeOpen.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 48 48" fill="none">
                        <path d="M24 4C12 4 2 12 2 24s10 20 22 20 22-8 22-20S36 4 24 4z" stroke="black" stroke-width="4"/>
                        <path d="M24 12c-6.6 0-12 5.4-12 12s5.4 12 12 12 12-5.4 12-12-5.4-12-12-12z" stroke="black" stroke-width="4"/>
                        <path d="M24 18c-3.3 0-6 2.7-6 6s2.7 6 6 6 6-2.7 6-6-2.7-6-6-6z" stroke="black" stroke-width="4"/>
                        <line x1="6" y1="6" x2="42" y2="42" stroke="black" stroke-width="4"/>
                    </svg>
                `;
            } else {
                loginPassword.type = 'password';
                eyeOpen.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 48 48" fill="none">
                        <ellipse cx="24" cy="24" rx="20" ry="13" stroke="black" stroke-width="4"/>
                        <circle cx="24" cy="24" r="7" stroke="black" stroke-width="4"/>
                    </svg>
                `;
            }
        }
    }

    logout() {
        this.isLoggedIn = false;
        this.saveToStorage('isLoggedIn', false);
        location.reload();
    }

    setupEventListeners() {
        try {
            console.log('🔧 Configurando event listeners...');
            
            // Navegación
            const navBtns = document.querySelectorAll('.nav-btn');
            console.log(`Navegación: ${navBtns ? navBtns.length : 0} botones encontrados`);
            
            if (navBtns && navBtns.length > 0) {
                navBtns.forEach((btn, index) => {
                    try {
                        if (btn && btn.dataset && btn.dataset.view) {
                            btn.addEventListener('click', (e) => {
                                this.switchView(e.target.dataset.view);
                            });
                            console.log(`✅ Botón de navegación ${index + 1} configurado`);
                        } else {
                            console.log(`⚠️ Botón de navegación ${index + 1} sin dataset.view`);
                        }
                    } catch (error) {
                        console.error(`❌ Error en botón de navegación ${index + 1}:`, error);
                    }
                });
            }

            // Función helper para agregar event listeners de forma segura
            const safeAddEventListener = (elementId, eventType, handler, description) => {
                try {
                    const element = document.getElementById(elementId);
                    if (element && typeof element.addEventListener === 'function') {
                        element.addEventListener(eventType, handler);
                        console.log(`✅ ${description} configurado`);
                        return true;
                    } else {
                        console.log(`⚠️ ${description} no encontrado o no válido`);
                        return false;
                    }
                } catch (error) {
                    console.error(`❌ Error configurando ${description}:`, error);
                    return false;
                }
            };

            // Botones del header
            safeAddEventListener('addEmployeeBtn', 'click', () => this.openEmployeeModal(), 'Botón Agregar Personal');
            safeAddEventListener('exportBtn', 'click', () => this.exportData(), 'Botón Exportar');

            // Formularios
            safeAddEventListener('employeeForm', 'submit', (e) => {
                e.preventDefault();
                this.saveEmployee();
            }, 'Formulario de Personal');

            safeAddEventListener('attendanceForm', 'submit', (e) => {
                e.preventDefault();
                this.saveAttendance();
            }, 'Formulario de Asistencia');

            // Botones de cerrar modales
            safeAddEventListener('closeModal', 'click', () => this.closeEmployeeModal(), 'Botón Cerrar Modal Personal');
            safeAddEventListener('cancelModal', 'click', () => this.closeEmployeeModal(), 'Botón Cancelar Modal Personal');
            safeAddEventListener('closeAttendanceModal', 'click', () => this.closeAttendanceModal(), 'Botón Cerrar Modal Asistencia');
            safeAddEventListener('cancelAttendanceModal', 'click', () => this.closeAttendanceModal(), 'Botón Cancelar Modal Asistencia');

            // Select de estado de asistencia
            safeAddEventListener('attendanceStatus', 'change', (e) => {
                this.handleAttendanceStatusChange(e.target.value);
            }, 'Select Estado Asistencia');

            // Botones adicionales
            safeAddEventListener('addNewEmployeeBtn', 'click', () => this.openEmployeeModal(), 'Botón Agregar Nuevo Personal');
            safeAddEventListener('generateReportBtn', 'click', () => this.generateReport(), 'Botón Generar Reporte');
            safeAddEventListener('generateControlReportBtn', 'click', () => this.generateControlReport(), 'Botón Generar Reporte de Control');
            safeAddEventListener('saveConfigBtn', 'click', () => this.saveControlConfig(), 'Botón Guardar Configuración');

            // Cerrar modales al hacer clic fuera
            window.addEventListener('click', (e) => {
                if (e.target && e.target.classList && e.target.classList.contains('modal')) {
                    this.closeEmployeeModal();
                    this.closeAttendanceModal();
                }
            });

            // Planilla mensual
            safeAddEventListener('planillaMonth', 'change', () => this.renderPlanilla(), 'Input Mes Planilla');

            // Gestos táctiles para móviles
            // this.setupTouchGestures(); // Desactivado para que solo funcione con click
            
            // Filtros de empleados
            const searchInput = document.getElementById('employeeSearch');
            const turnoFilter = document.getElementById('employeeTurnoFilter');
            if (searchInput) searchInput.addEventListener('input', () => this.renderEmployees());
            if (turnoFilter) turnoFilter.addEventListener('change', () => this.renderEmployees());
            
            console.log('✅ Configuración de event listeners completada');
            
        } catch (error) {
            console.error('❌ Error en setupEventListeners:', error);
            console.error('Stack trace:', error.stack);
        }
    }

    // setupTouchGestures() {
    //     try {
    //         document.addEventListener('touchstart', (e) => {
    //             if (e.touches && e.touches.length > 0) {
    //                 this.startX = e.touches[0].clientX;
    //                 this.startY = e.touches[0].clientY;
    //             }
    //         }, false);

    //         document.addEventListener('touchend', (e) => {
    //             if (e.changedTouches && e.changedTouches.length > 0) {
    //                 this.endX = e.changedTouches[0].clientX;
    //                 this.endY = e.changedTouches[0].clientY;
    //                 this.handleSwipe();
    //             }
    //         }, false);

    //         // Prevenir zoom en inputs
    //         const inputs = document.querySelectorAll('input, select, textarea');
    //         if (inputs && inputs.length > 0) {
    //             inputs.forEach(input => {
    //                 if (input) {
    //                     input.addEventListener('touchstart', (e) => {
    //                         if (e.target) {
    //                             e.target.style.fontSize = '16px'; // Prevenir zoom en iOS
    //                         }
    //                     });
    //                 }
    //             });
    //         }
    //     } catch (error) {
    //         console.error('❌ Error en setupTouchGestures:', error);
    //     }
    // }

    handleSwipe() {
        const minSwipeDistance = 50;
        const deltaX = this.endX - this.startX;
        const deltaY = this.endY - this.startY;

        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > minSwipeDistance) {
            // Navegación horizontal
            const views = ['dashboard', 'attendance', 'employees', 'reports', 'planilla'];
            const currentIndex = views.indexOf(this.currentView);
            
            if (deltaX > 0 && currentIndex > 0) {
                // Swipe derecha - vista anterior
                this.switchView(views[currentIndex - 1]);
            } else if (deltaX < 0 && currentIndex < views.length - 1) {
                // Swipe izquierda - vista siguiente
                this.switchView(views[currentIndex + 1]);
            }
        }
    }

    setupDateInputs() {
        // Función para obtener la fecha actual en formato YYYY-MM-DD (fecha local)
        const getCurrentDate = () => {
            const now = new Date();
            const year = now.getFullYear();
            const month = (now.getMonth() + 1).toString().padStart(2, '0');
            const day = now.getDate().toString().padStart(2, '0');
            return `${year}-${month}-${day}`;
        };

        // Función para actualizar la fecha automáticamente
        const updateCurrentDate = () => {
            const currentDate = getCurrentDate();
            const attendanceDate = document.getElementById('attendanceDate');
            
            if (attendanceDate && attendanceDate.value !== currentDate) {
                attendanceDate.value = currentDate;
                this.renderAttendance();
                this.updateDashboard();
                this.showFeedbackMessage(`Fecha actualizada automáticamente a ${currentDate}`, 'success');
            }
        };

        // Establecer fecha inicial
        const today = getCurrentDate();
        
        // Fecha de asistencia
        const attendanceDate = document.getElementById('attendanceDate');
        if (attendanceDate) {
            attendanceDate.value = today;
            attendanceDate.addEventListener('change', () => {
                this.renderAttendance();
            });
        }

        // Fechas de reporte
        const reportStartDate = document.getElementById('reportStartDate');
        const reportEndDate = document.getElementById('reportEndDate');
        
        if (reportStartDate && reportEndDate) {
            // Establecer fechas por defecto (último mes)
            const lastMonth = new Date();
            lastMonth.setMonth(lastMonth.getMonth() - 1);
            const lastMonthYear = lastMonth.getFullYear();
            const lastMonthMonth = (lastMonth.getMonth() + 1).toString().padStart(2, '0');
            const lastMonthDay = lastMonth.getDate().toString().padStart(2, '0');
            reportStartDate.value = `${lastMonthYear}-${lastMonthMonth}-${lastMonthDay}`;
            reportEndDate.value = today;
        }

        // Mes de planilla
        const planillaMonth = document.getElementById('planillaMonth');
        if (planillaMonth) {
            const now = new Date();
            const year = now.getFullYear();
            const month = (now.getMonth() + 1).toString().padStart(2, '0');
            const currentMonth = `${year}-${month}`;
            planillaMonth.value = currentMonth;
        }

        // Configurar actualización automática de fecha
        this.setupAutoDateUpdate(updateCurrentDate);
    }

    setupAutoDateUpdate(updateFunction) {
        // Verificar cada minuto si la fecha cambió
        setInterval(() => {
            const now = new Date();
            const currentHour = now.getHours();
            const currentMinute = now.getMinutes();
            
            // Si son las 00:00, actualizar la fecha
            if (currentHour === 0 && currentMinute === 0) {
                updateFunction();
            }
        }, 60000); // Verificar cada minuto

        // Actualizar la hora cada segundo
        setInterval(() => {
            this.updateCurrentTime();
        }, 1000); // Actualizar cada segundo

        // También verificar al cargar la página
        updateFunction();
    }

    switchView(viewName) {
        // Actualizar navegación
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        const activeBtn = document.querySelector(`[data-view="${viewName}"]`);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }

        // Actualizar vistas
        document.querySelectorAll('.view').forEach(view => {
            view.classList.remove('active');
        });
        const targetView = document.getElementById(viewName);
        if (targetView) {
            targetView.classList.add('active');
        }

        this.currentView = viewName;

        // Actualizar contenido según la vista
        switch(viewName) {
            case 'dashboard':
                this.updateDashboard();
                break;
            case 'attendance':
                this.renderAttendance();
                break;
            case 'employees':
                this.renderEmployees();
                break;
            case 'reports':
                this.renderReports();
                break;
            case 'planilla':
                this.renderPlanillaLeyenda();
                this.renderPlanilla();
                break;
        }
    }

    // Gestión de empleados
    openEmployeeModal(employeeId = null) {
        this.editingEmployeeId = employeeId;
        const modal = document.getElementById('employeeModal');
        const form = document.getElementById('employeeForm');
        const title = document.getElementById('modalTitle');

        if (employeeId) {
            const employee = this.employees.find(emp => emp.id === employeeId);
            if (employee) {
                title.textContent = 'Editar Personal';
                document.getElementById('employeeName').value = employee.name;
                document.getElementById('employeePosition').value = employee.position;
                document.getElementById('employeePhone').value = employee.phone || '';
                document.getElementById('employeeTurno').value = employee.turno || '';
            }
        } else {
            title.textContent = 'Agregar Personal';
            form.reset();
        }

        modal.style.display = 'block';
        modal.removeAttribute('inert');
        // Poner el foco en el primer input del modal
        setTimeout(() => {
            const nameInput = document.getElementById('employeeName');
            if (nameInput) nameInput.focus();
        }, 50);
    }

    closeEmployeeModal() {
        const modal = document.getElementById('employeeModal');
        // Quitar el foco de cualquier elemento dentro del modal
        if (modal.contains(document.activeElement)) {
            document.activeElement.blur();
        }
        modal.setAttribute('inert', '');
        modal.style.display = 'none';
        this.editingEmployeeId = null;
    }

    showFeedbackMessage(message, type = 'success') {
        const el = document.getElementById('feedbackMessage');
        if (!el) return;
        el.textContent = message;
        el.style.display = 'block';
        el.style.background = type === 'success' ? '#d4f7dc' : '#ffd6d6';
        el.style.color = type === 'success' ? '#1b5e20' : '#b71c1c';
        el.style.border = type === 'success' ? '2px solid #43a047' : '2px solid #e53935';
        setTimeout(() => { el.style.display = 'none'; }, 3000);
    }

    saveEmployee() {
        const name = document.getElementById('employeeName').value.trim();
        const position = document.getElementById('employeePosition').value.trim();
        const phone = document.getElementById('employeePhone').value.trim();
        const turno = document.getElementById('employeeTurno').value;

        if (!name || !position) {
            alert('Por favor complete los campos obligatorios');
            return;
        }

        if (this.editingEmployeeId) {
            // Editar empleado existente
            const index = this.employees.findIndex(emp => emp.id === this.editingEmployeeId);
            if (index !== -1) {
                this.employees[index] = {
                    ...this.employees[index],
                    name,
                    position,
                    phone,
                    turno
                };
            }
        } else {
            // Agregar nuevo empleado
            const newEmployee = {
                id: Date.now().toString(),
                name,
                position,
                phone,
                turno,
                createdAt: new Date().toISOString()
            };
            this.employees.push(newEmployee);
        }

        this.saveToStorage('employees', this.employees);
        this.closeEmployeeModal();
        this.renderEmployees();
        this.updateDashboard();
        this.renderAttendance();
        this.showFeedbackMessage(this.editingEmployeeId ? 'Empleado actualizado correctamente.' : 'Empleado agregado correctamente.', 'success');
    }

    deleteEmployee(employeeId) {
        const employee = this.employees.find(emp => emp.id === employeeId);
        if (!employee) return;
        if (confirm(`¿Está seguro de que desea eliminar a ${employee.name}? Esta acción no se puede deshacer y eliminará todos sus registros de asistencia.`)) {
            this.employees = this.employees.filter(emp => emp.id !== employeeId);
            // Eliminar asistencias asociadas
            Object.keys(this.attendance).forEach(key => {
                if (key.startsWith(employeeId + '_')) delete this.attendance[key];
            });
            this.saveToStorage('employees', this.employees);
            this.saveToStorage('attendance', this.attendance);
            this.renderEmployees();
            this.updateDashboard();
            this.renderAttendance();
            this.showFeedbackMessage('Empleado y registros eliminados correctamente.', 'success');
        } else {
            this.showFeedbackMessage('Eliminación cancelada.', 'error');
        }
    }

    renderEmployees() {
        const container = document.getElementById('employeesList');
        if (!container) return;
        if (this.employees.length === 0) {
            container.innerHTML = '<div class="summary-item">No hay empleados registrados.</div>';
            return;
        }
        container.innerHTML = this.employees.map((emp, idx) => {
            let saldo = emp.extraHoursSaldo || 0;
            let saldoStr = '';
            if (saldo > 0) {
                const h = Math.floor(saldo);
                const m = Math.round((saldo - h) * 60);
                saldoStr = `<div style='color:#1976D2;font-weight:600;font-size:0.95em;margin-top:0.3em;'>Horas extras acumuladas: <span style='color:#00b2c6;'>${h}:${m.toString().padStart(2, '0')}</span></div>`;
            }
            // Línea divisoria excepto en el primero
            let borderStyle = idx > 0 ? 'border-top:2px solid #fff;' : '';
            return `
                <div class="employee-card" style="${borderStyle}">
                    <div class="employee-card-header">
                        <div class="employee-card-name">${emp.name}</div>
                        <div class="employee-card-actions">
                            <button class="btn-primary btn-small" onclick="app.openEmployeeModal('${emp.id}')">✏️ Editar</button>
                            <button class="btn-danger btn-small" onclick="app.deleteEmployee('${emp.id}')" style="margin-left:0.5em;">🗑️ Borrar</button>
                        </div>
                    </div>
                    <div class="employee-card-details">
                        <div><strong>Cargo:</strong> ${emp.position || '-'}</div>
                        <div><strong>Turno:</strong> ${emp.turno || '-'}</div>
                        <div><strong>Teléfono:</strong> ${emp.phone || '-'}</div>
                        ${saldoStr}
                    </div>
                </div>
            `;
        }).join('');
    }

    // Gestión de asistencia
    openAttendanceModal(employeeId, date) {
        const employee = this.employees.find(emp => emp.id === employeeId);
        if (!employee) return;

        const modal = document.getElementById('attendanceModal');
        const existingRecord = this.getAttendanceRecord(employeeId, date);

        // Llenar el formulario con datos existentes si los hay
        if (existingRecord) {
            document.getElementById('attendanceStatus').value = existingRecord.status;
            document.getElementById('shiftChangeType').value = existingRecord.shiftChangeType || 'solo';
            document.getElementById('companionName').value = existingRecord.companionId || '';
            document.getElementById('observations').value = existingRecord.observations || '';
            document.getElementById('shiftChangeStart').value = existingRecord.shiftChangeStart || '';
            document.getElementById('shiftChangeEnd').value = existingRecord.shiftChangeEnd || '';
            document.getElementById('extraHours').value = existingRecord.extraHours || 0;
        } else {
            document.getElementById('attendanceForm').reset();
            document.getElementById('extraHours').value = 0; // Resetear horas extras
        }

        // Llenar opciones de compañeros
        const companionSelect = document.getElementById('companionName');
        if (companionSelect) {
            companionSelect.innerHTML = '<option value="">Seleccionar compañero...</option>';
            this.employees
                .filter(emp => emp.id !== employeeId)
                .forEach(emp => {
                    companionSelect.innerHTML += `<option value="${emp.id}">${emp.name}</option>`;
                });
        }

        // Guardar datos para el guardado
        modal.dataset.employeeId = employeeId;
        modal.dataset.date = date;

        modal.style.display = 'block';
        modal.removeAttribute('inert');
        // Poner el foco en el primer input del modal
        setTimeout(() => {
            const statusInput = document.getElementById('attendanceStatus');
            if (statusInput) statusInput.focus();
        }, 50);
    }

    closeAttendanceModal() {
        const modal = document.getElementById('attendanceModal');
        // Quitar el foco de cualquier elemento dentro del modal
        if (modal.contains(document.activeElement)) {
            document.activeElement.blur();
        }
        modal.setAttribute('inert', '');
        modal.style.display = 'none';
        // Opcional: devolver el foco al botón que abrió el modal si lo deseas
    }

    handleAttendanceStatusChange(status) {
        // Mostrar campos de cambio de guardia
        const shiftChangeGroup = document.getElementById('shiftChangeGroup');
        const companionGroup = document.getElementById('companionGroup');
        const shiftChangeDatesGroup = document.getElementById('shiftChangeDatesGroup');
        const vacacionesEstresGroup = document.getElementById('vacacionesEstresGroup');
        const extraHoursGroup = document.getElementById('extraHoursGroup');
        const carpetaMedicaGroup = document.getElementById('carpetaMedicaGroup');
        if (status === 'cambio-guardia') {
            if (shiftChangeGroup) shiftChangeGroup.style.display = '';
            if (companionGroup) companionGroup.style.display = '';
            if (shiftChangeDatesGroup) shiftChangeDatesGroup.style.display = '';
            if (vacacionesEstresGroup) vacacionesEstresGroup.style.display = 'none';
            if (extraHoursGroup) extraHoursGroup.style.display = 'none';
            if (carpetaMedicaGroup) carpetaMedicaGroup.style.display = 'none';
        } else if (status === 'vacaciones' || status === 'estres') {
            if (shiftChangeGroup) shiftChangeGroup.style.display = 'none';
            if (companionGroup) companionGroup.style.display = 'none';
            if (shiftChangeDatesGroup) shiftChangeDatesGroup.style.display = 'none';
            if (vacacionesEstresGroup) vacacionesEstresGroup.style.display = '';
            if (extraHoursGroup) extraHoursGroup.style.display = 'none';
            if (carpetaMedicaGroup) carpetaMedicaGroup.style.display = 'none';
        } else if (status === 'presente') {
            if (shiftChangeGroup) shiftChangeGroup.style.display = 'none';
            if (companionGroup) companionGroup.style.display = 'none';
            if (shiftChangeDatesGroup) shiftChangeDatesGroup.style.display = 'none';
            if (vacacionesEstresGroup) vacacionesEstresGroup.style.display = 'none';
            if (extraHoursGroup) extraHoursGroup.style.display = '';
            if (carpetaMedicaGroup) carpetaMedicaGroup.style.display = 'none';
        } else if (status === 'carpeta-medica') {
            if (shiftChangeGroup) shiftChangeGroup.style.display = 'none';
            if (companionGroup) companionGroup.style.display = 'none';
            if (shiftChangeDatesGroup) shiftChangeDatesGroup.style.display = 'none';
            if (vacacionesEstresGroup) vacacionesEstresGroup.style.display = 'none';
            if (extraHoursGroup) extraHoursGroup.style.display = 'none';
            if (carpetaMedicaGroup) carpetaMedicaGroup.style.display = '';
        } else {
            if (shiftChangeGroup) shiftChangeGroup.style.display = 'none';
            if (companionGroup) companionGroup.style.display = 'none';
            if (shiftChangeDatesGroup) shiftChangeDatesGroup.style.display = 'none';
            if (vacacionesEstresGroup) vacacionesEstresGroup.style.display = 'none';
            if (extraHoursGroup) extraHoursGroup.style.display = 'none';
            if (carpetaMedicaGroup) carpetaMedicaGroup.style.display = 'none';
        }
        // Calcular fecha de retorno automáticamente
        const fechaInicio = document.getElementById('fechaInicioVacacionesEstres');
        const dias = document.getElementById('diasVacacionesEstres');
        const fechaRetorno = document.getElementById('fechaRetornoVacacionesEstres');
        if (fechaInicio && dias && fechaRetorno) {
            const updateFechaRetorno = () => {
                if (fechaInicio.value && dias.value) {
                    const inicio = new Date(fechaInicio.value);
                    const cantidad = parseInt(dias.value);
                    if (!isNaN(inicio.getTime()) && cantidad > 0) {
                        const retorno = new Date(inicio);
                        retorno.setDate(retorno.getDate() + cantidad);
                        const retornoYear = retorno.getFullYear();
                        const retornoMonth = (retorno.getMonth() + 1).toString().padStart(2, '0');
                        const retornoDay = retorno.getDate().toString().padStart(2, '0');
                        fechaRetorno.value = `${retornoYear}-${retornoMonth}-${retornoDay}`;
                    } else {
                        fechaRetorno.value = '';
                    }
                } else {
                    fechaRetorno.value = '';
                }
            };
            fechaInicio.onchange = updateFechaRetorno;
            dias.oninput = updateFechaRetorno;
        }
        
        // Mostrar/ocultar campo de compañero según tipo de cambio
        const shiftChangeType = document.getElementById('shiftChangeType');
        const companionGroupField = document.getElementById('companionGroup');
        if (shiftChangeType && companionGroupField) {
            const updateCompanionVisibility = () => {
                if (shiftChangeType.value === 'con-companero') {
                    companionGroupField.style.display = '';
                } else {
                    companionGroupField.style.display = 'none';
                }
            };
            shiftChangeType.onchange = updateCompanionVisibility;
            // Ejecutar una vez al cargar para establecer el estado inicial
            updateCompanionVisibility();
        }
    }

    saveAttendance() {
        const modal = document.getElementById('attendanceModal');
        const employeeId = modal.dataset.employeeId;
        const date = modal.dataset.date;
        const status = document.getElementById('attendanceStatus').value;
        const shiftChangeType = document.getElementById('shiftChangeType').value;
        const companionId = document.getElementById('companionName').value;
        const observations = document.getElementById('observations').value.trim();
        const shiftChangeStart = document.getElementById('shiftChangeStart').value;
        const shiftChangeEnd = document.getElementById('shiftChangeEnd').value;
        const extraHours = parseFloat(document.getElementById('extraHours').value) || 0;
        const fechaLicencia = document.getElementById('fechaLicencia')?.value;
        const fechaAlta = document.getElementById('fechaAlta')?.value;
        // NUEVO: Descontar horas extras
        let descontarHoras = 0;
        const descontarVal = document.getElementById('descontarHoras').value.trim();
        if (descontarVal) {
            if (descontarVal.includes(':')) {
                const [h, m] = descontarVal.split(':').map(Number);
                if (!isNaN(h) && !isNaN(m)) descontarHoras = h + m/60;
            } else {
                descontarHoras = parseFloat(descontarVal);
            }
            if (isNaN(descontarHoras) || descontarHoras < 0) descontarHoras = 0;
        }
        if (!employeeId || !date || !status) {
            alert('Por favor complete todos los campos obligatorios');
            return;
        }

        // NUEVO: Validación específica para Artículo 26
        if (status === 'A26') {
            const validationResult = this.validateArticulo26(employeeId, date);
            if (!validationResult.valid) {
                alert(validationResult.message);
                return;
            }
        }
        const record = {
            employeeId,
            date,
            status,
            observations,
            timestamp: new Date().toISOString(),
            extraHours
        };
        if (status === 'cambio-guardia') {
            record.shiftChangeType = shiftChangeType;
            if (shiftChangeType === 'con-companero' && companionId) {
                record.companionId = companionId;
            }
            record.shiftChangeStart = shiftChangeStart;
            record.shiftChangeEnd = shiftChangeEnd;
        }
        if (status === 'carpeta-medica') {
            record.fechaLicencia = fechaLicencia;
            record.fechaAlta = fechaAlta;
        }
        // --- Lógica de horas extras acumuladas ---
        const emp = this.employees.find(e => e.id === employeeId);
        if (emp) {
            if (!emp.extraHoursSaldo) emp.extraHoursSaldo = 0;
            if (!emp.extraHoursHistorial) emp.extraHoursHistorial = [];
            // Sumar solo si es un nuevo registro o si cambió el valor
            const prev = this.attendance[employeeId] && this.attendance[employeeId][date] && this.attendance[employeeId][date].extraHours ? this.attendance[employeeId][date].extraHours : 0;
            let diff = extraHours - prev;
            if (diff !== 0) {
                emp.extraHoursSaldo += diff;
                emp.extraHoursHistorial.push({
                    tipo: diff > 0 ? 'suma' : 'resta',
                    cantidad: Math.abs(diff),
                    fecha: date,
                    motivo: diff > 0 ? 'Registro de asistencia' : 'Modificación de asistencia',
                    timestamp: new Date().toISOString()
                });
            }
            // NUEVO: Descontar horas extras si corresponde
            if (descontarHoras > 0) {
                // Restar del saldo total
                emp.extraHoursSaldo -= descontarHoras;
                if (emp.extraHoursSaldo < 0) emp.extraHoursSaldo = 0;
                // Restar del registro del día
                record.extraHours -= descontarHoras;
                if (record.extraHours < 0) record.extraHours = 0;
                emp.extraHoursHistorial.push({
                    tipo: 'resta',
                    cantidad: descontarHoras,
                    fecha: date,
                    motivo: 'Descuento desde formulario',
                    timestamp: new Date().toISOString()
                });
            }
            this.saveToStorage('employees', this.employees);
        }
        // --- Fin lógica horas extras ---
        this.setAttendanceRecord(employeeId, date, record);
        // NUEVO: Si es cambio de guardia y hay fecha de devolución, registrar devolución en ambos empleados
        if (status === 'cambio-guardia' && shiftChangeEnd) {
            // Buscar nombres
            const solicitanteNombre = emp ? emp.name : '';
            let companeroNombre = '';
            if (shiftChangeType === 'con-companero' && companionId) {
                const companero = this.employees.find(e => e.id === companionId);
                companeroNombre = companero ? companero.name : '';
            }
            // Registro para el titular (quien entrega)
            let obsTitular = '';
            if (shiftChangeType === 'con-companero' && companeroNombre) {
                obsTitular = `Devolución de guardia a ${companeroNombre}`;
            } else {
                obsTitular = 'Devolución de guardia (solo)';
            }
            const devolucionRecordTitular = {
                employeeId,
                date: shiftChangeEnd,
                status: 'cambio-guardia',
                observations: obsTitular,
                timestamp: new Date().toISOString(),
                extraHours: 0,
                shiftChangeType,
                companionId: (shiftChangeType === 'con-companero' && companionId) ? companionId : '',
                shiftChangeStart,
                shiftChangeEnd,
                solicitanteNombre
            };
            this.setAttendanceRecord(employeeId, shiftChangeEnd, devolucionRecordTitular);
            // Registro para el compañero (si corresponde)
            if (shiftChangeType === 'con-companero' && companionId && companeroNombre) {
                // En la fecha de inicio: el compañero recibe la guardia
                const obsCompaneroInicio = `Recibe cambio de guardia de ${solicitanteNombre}`;
                const recordCompaneroInicio = {
                    employeeId: companionId,
                    date,
                    status: 'cambio-guardia',
                    observations: obsCompaneroInicio,
                    timestamp: new Date().toISOString(),
                    extraHours: 0,
                    shiftChangeType: 'con-companero',
                    companionId: employeeId,
                    shiftChangeStart: date,
                    shiftChangeEnd,
                    solicitanteNombre
                };
                this.setAttendanceRecord(companionId, date, recordCompaneroInicio);
                // En la devolución: el compañero recibe la devolución
                const obsCompaneroDevolucion = `Recibe devolución de guardia de ${solicitanteNombre}`;
                const recordCompaneroDevolucion = {
                    employeeId: companionId,
                    date: shiftChangeEnd,
                    status: 'cambio-guardia',
                    observations: obsCompaneroDevolucion,
                    timestamp: new Date().toISOString(),
                    extraHours: 0,
                    shiftChangeType: 'con-companero',
                    companionId: employeeId,
                    shiftChangeStart: date,
                    shiftChangeEnd,
                    solicitanteNombre
                };
                this.setAttendanceRecord(companionId, shiftChangeEnd, recordCompaneroDevolucion);
            }
        }
        this.saveToStorage('attendance', this.attendance);
        this.closeAttendanceModal();
        this.renderAttendance();
        this.updateDashboard();
        this.showFeedbackMessage('Asistencia guardada correctamente.', 'success');
        // Marcar automáticamente varios días si es vacaciones o estrés
        if (status === 'vacaciones' || status === 'estres') {
            const fechaInicio = document.getElementById('fechaInicioVacacionesEstres')?.value;
            const dias = parseInt(document.getElementById('diasVacacionesEstres')?.value || '1');
            if (fechaInicio && dias > 0) {
                for (let i = 0; i < dias; i++) {
                    const d = new Date(fechaInicio);
                    d.setDate(d.getDate() + i);
                    const fechaYear = d.getFullYear();
                    const fechaMonth = (d.getMonth() + 1).toString().padStart(2, '0');
                    const fechaDay = d.getDate().toString().padStart(2, '0');
                    const fechaStr = `${fechaYear}-${fechaMonth}-${fechaDay}`;
                    const multiRecord = {
                        employeeId,
                        date: fechaStr,
                        status,
                        observations,
                        timestamp: new Date().toISOString(),
                        extraHours: 0
                    };
                    this.setAttendanceRecord(employeeId, fechaStr, multiRecord);
                }
                this.saveToStorage('attendance', this.attendance);
                this.closeAttendanceModal();
                this.renderAttendance();
                this.updateDashboard();
                this.showFeedbackMessage('Asistencia guardada correctamente.', 'success');
                return;
            }
        }
    }

    getAttendanceRecord(employeeId, date) {
        return this.attendance[`${employeeId}_${date}`];
    }

    setAttendanceRecord(employeeId, date, record) {
        this.attendance[`${employeeId}_${date}`] = record;
    }

    // NUEVO: Validación específica para Artículo 26
    validateArticulo26(employeeId, date) {
        const targetDate = new Date(date);
        const year = targetDate.getFullYear();
        const month = targetDate.getMonth() + 1;
        
        // Contar días de Artículo 26 en el año
        let diasAnio = 0;
        let diasMes = 0;
        
        for (let d = 1; d <= 12; d++) {
            for (let day = 1; day <= new Date(year, d, 0).getDate(); day++) {
                const dateStr = `${year}-${d.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
                const record = this.getAttendanceRecord(employeeId, dateStr);
                if (record && record.status === 'A26') {
                    diasAnio++;
                    if (d === month) {
                        diasMes++;
                    }
                }
            }
        }
        
        // Verificar límites
        if (diasAnio >= 6) {
            return {
                valid: false,
                message: 'Error: Ya se han utilizado los 6 días de Artículo 26 disponibles para este año.'
            };
        }
        
        if (diasMes >= 1) {
            return {
                valid: false,
                message: 'Error: Ya se ha utilizado el día de Artículo 26 disponible para este mes.'
            };
        }
        
        return { valid: true };
    }

    // NUEVO: Función auxiliar para contar días de Artículo 26 por año
    getArticulo26Anio(employeeId, year) {
        let diasAnio = 0;
        
        for (let month = 1; month <= 12; month++) {
            for (let day = 1; day <= new Date(year, month, 0).getDate(); day++) {
                const dateStr = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
                const record = this.getAttendanceRecord(employeeId, dateStr);
                if (record && record.status === 'A26') {
                    diasAnio++;
                }
            }
        }
        
        return diasAnio;
    }

    // NUEVO: Función para obtener resumen anual de Artículo 26
    getArticulo26Summary(year) {
        let totalUsados = 0;
        let empleadosConA26 = 0;
        
        this.employees.forEach(employee => {
            const diasUsados = this.getArticulo26Anio(employee.id, year);
            if (diasUsados > 0) {
                totalUsados += diasUsados;
                empleadosConA26++;
            }
        });
        
        return {
            totalUsados,
            empleadosConA26
        };
    }

    renderAttendance() {
        const date = document.getElementById('attendanceDate')?.value;
        const container = document.getElementById('attendanceList');
        if (!container || !date) return;
        
        if (this.employees.length === 0) {
            container.innerHTML = `
                <div class="summary-item">
                    <p>No hay personal registrado. Agregue personal primero.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.employees.map(employee => {
            const record = this.getAttendanceRecord(employee.id, date);
            const status = record ? record.status : 'no-registrado';
            
            return `
                <div class="attendance-item">
                    <div class="employee-info">
                        <div class="employee-name">${employee.name}</div>
                        <div class="employee-id">${employee.position}</div>
                    </div>
                    <div class="attendance-status status-${status}">
                        ${this.getStatusText(status)}
                    </div>
                    <div class="attendance-actions">
                        <button class="btn-primary btn-small" onclick="app.openAttendanceModal('${employee.id}', '${date}')">
                            ${record ? '✏️ Editar' : '📝 Registrar'}
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    getStatusText(status) {
        const statusTextMap = {
            'sin-asignar': 'Sin asignar',
            'presente': 'Presente',
            'ausente': 'Ausente',
            'vacaciones': 'Vacaciones',
            'estres': 'Estrés',
            'cambio-guardia': 'Cambio de Guardia',
            'carpeta-medica': 'Carpeta Médica',
            'accidente': 'Carpeta Médica',
            'A26': 'Artículo 26',
            'compensatorio': 'Compensatorio'
        };
        return statusTextMap[status] || status;
    }

    // Dashboard
    updateDashboard() {
        const now = new Date();
        const year = now.getFullYear();
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        const day = now.getDate().toString().padStart(2, '0');
        const today = `${year}-${month}-${day}`;
        
        // Actualizar hora y fecha actual
        this.updateCurrentTime();
        
        const totalEmployeesEl = document.getElementById('totalEmployees');
        if (totalEmployeesEl) totalEmployeesEl.textContent = this.employees.length;
        
        const todayStats = this.getTodayStats(today);
        const presentTodayEl = document.getElementById('presentToday');
        if (presentTodayEl) presentTodayEl.textContent = todayStats.present;
        
        const absentTodayEl = document.getElementById('absentToday');
        if (absentTodayEl) absentTodayEl.textContent = todayStats.absent;
        
        const vacationTodayEl = document.getElementById('vacationToday');
        if (vacationTodayEl) vacationTodayEl.textContent = todayStats.vacation;

        const a26TodayEl = document.getElementById('a26Today');
        if (a26TodayEl) {
            let a26Value = todayStats.a26;
            if (typeof a26Value !== 'number' || isNaN(a26Value)) a26Value = 0;
            a26TodayEl.textContent = a26Value;
        }

        this.renderTodaySummary(today);
        // --- Gráfica de asistencia mensual ---
        renderAsistenciaChart(this.employees, this.attendance);
        renderAsistenciaPorcentajes(this.employees, this.attendance);
    }

    updateCurrentTime() {
        try {
            const now = new Date();
            
            // Actualizar hora en formato 24 horas
            const timeElement = document.getElementById('currentTime');
            if (timeElement) {
                const timeString = now.toLocaleTimeString('es-ES', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: false
                });
                timeElement.textContent = timeString;
            }
            
            // Actualizar fecha
            const dateElement = document.getElementById('currentDate');
            if (dateElement) {
                const dateString = now.toLocaleDateString('es-ES', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                });
                dateElement.textContent = dateString;
            }
        } catch (error) {
            console.error('Error actualizando hora:', error);
            // Fallback: mostrar hora manualmente si hay error
            const now = new Date();
            const timeElement = document.getElementById('currentTime');
            const dateElement = document.getElementById('currentDate');
            
            if (timeElement) {
                const hours = now.getHours().toString().padStart(2, '0');
                const minutes = now.getMinutes().toString().padStart(2, '0');
                const seconds = now.getSeconds().toString().padStart(2, '0');
                timeElement.textContent = `${hours}:${minutes}:${seconds}`;
            }
            
            if (dateElement) {
                const day = now.getDate().toString().padStart(2, '0');
                const month = (now.getMonth() + 1).toString().padStart(2, '0');
                const year = now.getFullYear();
                dateElement.textContent = `${day}/${month}/${year}`;
            }
        }
    }

    getTodayStats(date) {
        const stats = { present: 0, absent: 0, vacation: 0, a26: 0, other: 0 };
        
        this.employees.forEach(employee => {
            const record = this.getAttendanceRecord(employee.id, date);
            if (record) {
                switch(record.status) {
                    case 'presente':
                        stats.present++;
                        break;
                    case 'ausente':
                        stats.absent++;
                        break;
                    case 'vacaciones':
                        stats.vacation++;
                        break;
                    case 'A26':
                        stats.a26++;
                        break;
                    default:
                        stats.other++;
                }
            }
        });

        return stats;
    }

    renderTodaySummary(date) {
        const container = document.getElementById('todaySummary');
        if (!container) return;
        
        const todayRecords = [];

        this.employees.forEach(employee => {
            const record = this.getAttendanceRecord(employee.id, date);
            if (record) {
                todayRecords.push({ employee, record });
            }
        });

        let html = '';

        // NUEVO: Mostrar resumen anual de Artículo 26
        const currentYear = new Date().getFullYear();
        const articulo26Summary = this.getArticulo26Summary(currentYear);
        if (articulo26Summary.totalUsados > 0) {
            html += `
                <div class="summary-item" style="background: #e3f2fd; border-left: 4px solid #1976d2; margin-bottom: 1rem;">
                    <div style="font-weight: bold; color: #1976d2;">Resumen Artículo 26 - ${currentYear}</div>
                    <div>Total usado: ${articulo26Summary.totalUsados}/6 días</div>
                    <div>Empleados con Artículo 26: ${articulo26Summary.empleadosConA26}</div>
                </div>
            `;
        }

        if (todayRecords.length === 0) {
            html += `
                <div class="summary-item">
                    <p>No hay registros de asistencia para hoy.</p>
                </div>
            `;
        } else {
            html += todayRecords.map(({ employee, record }) => {
                let details = `${employee.name} - ${this.getStatusText(record.status)}`;
                
                if (record.status === 'cambio-guardia' && record.shiftChangeType) {
                    details += ` (${record.shiftChangeType === 'solo' ? 'Solo' : 'Con Compañero'})`;
                }
                
                if (record.observations) {
                    details += ` - ${record.observations}`;
                }

                return `
                    <div class="summary-item">
                        <div>${details}</div>
                        <small>${new Date(record.timestamp).toLocaleTimeString('es-ES', {hour: '2-digit', minute: '2-digit', hour12: false})}</small>
                    </div>
                `;
            }).join('');
        }

        container.innerHTML = html;
    }

    // Reportes
    renderReports() {
        const container = document.getElementById('reportResults');
        if (!container) return;
        // Llenar select de empleados
        const select = document.getElementById('reportEmployeeSelect');
        if (select) {
            select.innerHTML = '<option value="">Todos</option>' + this.employees.map(emp => `<option value="${emp.id}">${emp.name}</option>`).join('');
        }
        container.innerHTML = `
            <div class="summary-item">
                <p>Seleccione un rango de fechas y haga clic en "Generar Reporte" para ver los resultados.</p>
            </div>
        `;
    }

    generateReport() {
        const startDate = document.getElementById('reportStartDate')?.value;
        const endDate = document.getElementById('reportEndDate')?.value;
        const employeeId = document.getElementById('reportEmployeeSelect')?.value;
        if (!startDate || !endDate) {
            alert('Por favor seleccione un rango de fechas');
            return;
        }
        let report = this.generateAttendanceReport(startDate, endDate);
        if (employeeId) {
            // Filtrar solo el empleado seleccionado
            report.employees = report.employees.filter(e => e.id === employeeId);
            // Recalcular resumen general solo para ese empleado
            report.summary.byStatus = {};
            report.summary.totalRecords = 0;
            report.employees.forEach(emp => {
                Object.keys(emp.totals).forEach(status => {
                    if (!report.summary.byStatus[status]) report.summary.byStatus[status] = 0;
                    report.summary.byStatus[status] += emp.totals[status];
                    report.summary.totalRecords += emp.totals[status];
                });
            });
        }
        this.displayReport(report);
    }

    generateAttendanceReport(startDate, endDate) {
        const report = {
            period: { start: startDate, end: endDate },
            employees: [],
            summary: {
                totalDays: 0,
                totalRecords: 0,
                byStatus: {}
            }
        };

        // Calcular días totales
        const start = new Date(startDate);
        const end = new Date(endDate);
        const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
        report.summary.totalDays = daysDiff;

        // Generar reporte por empleado
        this.employees.forEach(employee => {
            const employeeReport = {
                id: employee.id,
                name: employee.name,
                position: employee.position,
                attendance: {},
                totals: {
                    presente: 0,
                    ausente: 0,
                    vacaciones: 0,
                    estres: 0,
                    'llegada-tarde': 0,
                    accidente: 0,
                    'cambio-guardia': 0,
                    'carpeta_medica': 0,
                    'carpeta-medica': 0,
                    'A26': 0,
                    'no-registrado': 0
                }
            };

            // Contar asistencia por día
            for (let i = 0; i < daysDiff; i++) {
                const currentDate = new Date(start);
                currentDate.setDate(start.getDate() + i);
                const dateStr = currentDate.toISOString().split('T')[0];
                
                const record = this.getAttendanceRecord(employee.id, dateStr);
                const status = record ? record.status : 'no-registrado';
                
                employeeReport.attendance[dateStr] = {
                    status,
                    observations: record ? record.observations : '',
                    timestamp: record ? record.timestamp : null
                };
                
                if (!(status in employeeReport.totals)) {
                    employeeReport.totals[status] = 0;
                }
                employeeReport.totals[status]++;
                report.summary.totalRecords++;
            }

            report.employees.push(employeeReport);
        });

        // Calcular resumen por estado
        report.employees.forEach(emp => {
            Object.keys(emp.totals).forEach(status => {
                if (!report.summary.byStatus[status]) {
                    report.summary.byStatus[status] = 0;
                }
                report.summary.byStatus[status] += emp.totals[status];
            });
        });

        return report;
    }

    displayReport(report) {
        const container = document.getElementById('reportResults');
        if (!container) return;
        let html = `
            <div class="report-header">
                <h3>Reporte de Vigilancia</h3>
                <p><strong>Período:</strong> ${new Date(report.period.start).toLocaleDateString()} - ${new Date(report.period.end).toLocaleDateString()}</p>
                <p><strong>Total de días:</strong> ${report.summary.totalDays}</p>
            </div>
            <div class="report-summary">
                <h4>Resumen General</h4>
                <div class="summary-grid">
        `;
        // Mostrar todos los estados relevantes, incluyendo Artículo 26 aunque sea 0
        const estadosResumen = ['presente','ausente','vacaciones','estres','llegada-tarde','carpeta-medica','cambio-guardia','A26'];
        estadosResumen.forEach(status => {
            if (status === 'sin-asignar' || status === 'no-registrado') return;
            const count = report.summary.byStatus[status] || 0;
            html += `
                <div class="summary-stat">
                    <span class="stat-label">${status === 'A26' ? 'Artículo 26' : this.getStatusText(status)}:</span>
                    <span class="stat-value">${count}</span>
                </div>
            `;
        });
        html += `
                </div>
            </div>
            <div class="report-details">
                <h4>Detalle por Empleado</h4>
        `;
        report.employees.forEach(employee => {
            html += `
                <div class="employee-report">
                    <h5>${employee.name} (${employee.position})</h5>
                    <div class="employee-totals">
            `;
            Object.entries(employee.totals).forEach(([status, count]) => {
                if (count > 0 && status !== 'no-registrado') {
                    html += `
                        <span class="total-item">
                            ${this.getStatusText(status)}: ${count}
                        </span>
                    `;
                }
            });
            html += `
                    </div>
                </div>
            `;
        });
        html += `
            </div>
            <div class="report-actions">
                <button class="btn-primary" onclick="app.exportReportToPDF(app.lastReport)">🗎 Exportar a PDF</button>
            </div>
        `;
        container.innerHTML = html;
        this.lastReport = report;
    }

    // Planilla Mensual
    renderPlanillaLeyenda() {
        const container = document.getElementById('planillaLeyenda');
        if (!container) return;

        let html = '<h4>Leyenda de Especificaciones:</h4><div class="leyenda-grid">';
        PLANILLA_CODES.forEach(code => {
            html += `
                <div class="leyenda-item ${code.colorClass}">
                    <span class="leyenda-code">${code.code}</span>
                    <span class="leyenda-label">${code.label}</span>
                </div>
            `;
        });
        html += '</div>';
        container.innerHTML = html;
    }

    renderPlanilla() {
        const monthInput = document.getElementById('planillaMonth');
        if (!monthInput || !monthInput.value) return;

        const [year, month] = monthInput.value.split('-');
        const monthName = new Date(year, month - 1).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
        
        // --- NUEVO: Selector múltiple de empleados ---
        const selectorDiv = document.getElementById('planillaEmployeeSelector');
        if (selectorDiv) {
            selectorDiv.innerHTML = this.employees.map(emp => `
                <label style="display:flex;align-items:center;gap:0.2rem;">
                    <input type="checkbox" class="planilla-employee-checkbox" value="${emp.id}" checked> ${emp.name}
                </label>
            `).join('');
        }
        // Obtener IDs seleccionados
        let selectedIds = this.employees.map(e => e.id);
        if (selectorDiv) {
            const checked = selectorDiv.querySelectorAll('.planilla-employee-checkbox:checked');
            selectedIds = Array.from(checked).map(cb => cb.value);
            // Actualizar tabla al cambiar selección
            selectorDiv.querySelectorAll('.planilla-employee-checkbox').forEach(cb => {
                cb.onchange = () => this.renderPlanilla();
            });
        }

        const container = document.getElementById('planillaTable');
        if (!container) return;

        // Generar días del mes
        const daysInMonth = new Date(year, month, 0).getDate();
        let html = `
            <thead>
                <tr>
                    <th>Personal</th>
                    <th>Turno</th>
        `;
        for (let day = 1; day <= daysInMonth; day++) {
            html += `<th>${day}</th>`;
        }
        html += '</tr></thead><tbody>';

        this.employees.filter(emp => selectedIds.includes(emp.id)).forEach(employee => {
            html += `<tr><td>${employee.name}</td><td>${employee.turno || ''}</td>`;
            for (let day = 1; day <= daysInMonth; day++) {
                const dateStr = `${year}-${month.padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
                const record = this.getAttendanceRecord(employee.id, dateStr);
                const code = this.getPlanillaCode(record);
                let cellContent = code.code;
                let cellAttrs = '';
                if (code.code !== '-') {
                    // Guardar info relevante en data-atributos
                    const obs = record && record.observations ? record.observations.replace(/"/g, '&quot;') : '';
                    cellAttrs = `data-employee="${employee.name}" data-date="${dateStr}" data-status="${this.getStatusText(record?.status)}" data-obs="${obs}" class="${code.colorClass} planilla-novedad-cell" style="cursor:pointer;"`;
                } else {
                    cellAttrs = `class="${code.colorClass}"`;
                }
                html += `<td ${cellAttrs}>${cellContent}</td>`;
            }
            html += `</tr>`;
        });
        html += '</tbody>';
        container.innerHTML = html;

        // Actualizar título con el mes
        const planillaHeader = document.querySelector('.planilla-header h2');
        if (planillaHeader) {
            planillaHeader.textContent = `Planilla Mensual de Novedades - ${monthName}`;
        }

        // Agregar event listeners a las celdas con novedad
        container.querySelectorAll('.planilla-novedad-cell').forEach(cell => {
            cell.addEventListener('click', (e) => {
                const emp = cell.getAttribute('data-employee');
                const date = cell.getAttribute('data-date');
                const status = cell.getAttribute('data-status');
                const obs = cell.getAttribute('data-obs');
                this.showPlanillaModal(emp, date, status, obs);
            });
        });
    }

    getPlanillaCode(record) {
        if (!record) return { code: '-', colorClass: 'planilla-sin-asignar' };
        
        const statusMap = {
            'sin-asignar': { code: '-', colorClass: 'planilla-sin-asignar' },
            'presente': { code: 'G', colorClass: 'planilla-G' },
            'ausente': { code: '28', colorClass: 'planilla-28' },
            'vacaciones': { code: 'V', colorClass: 'planilla-V' },
            'estres': { code: 'EST', colorClass: 'planilla-EST' },
            'cambio-guardia': { code: 'CG', colorClass: 'planilla-CG' },
            'compensatorio': { code: 'CP', colorClass: 'planilla-CP' },
            'carpeta-medica': { code: 'CM', colorClass: 'planilla-CM' },
            'A26': { code: 'A26', colorClass: 'planilla-A26' }
        };
        return statusMap[record.status] || { code: '-', colorClass: 'planilla-sin-asignar' };
    }

    showPlanillaModal(employee, date, status, obs) {
        const modal = document.getElementById('planillaModal');
        const title = document.getElementById('planillaModalTitle');
        const body = document.getElementById('planillaModalBody');
        // Buscar el registro de asistencia para ese empleado y fecha
        const empObj = this.employees.find(e => e.name === employee);
        const record = empObj ? this.getAttendanceRecord(empObj.id, date) : null;
        let extraHours = record && record.extraHours ? record.extraHours : 0;
        let extraHoursStr = '';
        if (extraHours > 0) {
            const h = Math.floor(extraHours);
            const m = Math.round((extraHours - h) * 60);
            extraHoursStr = `${h}:${m.toString().padStart(2, '0')}`;
        }
        if (modal && title && body) {
            // Formatear fecha a DD/MM/AA para el título
            let fechaFormateada = date;
            if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
                const [y, m, d] = date.split('-');
                fechaFormateada = `${d}/${m}/${y.slice(2)}`;
            }
            title.textContent = `Novedad de ${employee} - ${fechaFormateada}`;
            let content = '';
            let obsFinal = obs;
            // Si es cambio de guardia, armo obsFinal con solicitante y compañero
            if (status && status.toLowerCase().includes('cambio')) {
                if (record) {
                    let companeroNombre = '';
                    if (record.companionId) {
                        const companero = this.employees.find(e => e.id === record.companionId);
                        companeroNombre = companero ? companero.name : '';
                    }
                    if (companeroNombre) {
                        if (obsFinal && !obsFinal.includes(companeroNombre)) {
                            obsFinal += `<br><b>Compañero:</b> ${companeroNombre}`;
                        } else if (!obsFinal || obsFinal === 'Sin observaciones') {
                            obsFinal = `<b>Compañero:</b> ${companeroNombre}`;
                        }
                    }
                    if (record.solicitanteNombre) {
                        obsFinal = `<b>Solicitante:</b> ${record.solicitanteNombre}` + (obsFinal ? '<br>' + obsFinal : '');
                    }
                }
            }
            // Siempre uso el mismo formato de tabla + línea + bloque observaciones
            content = `<table style='width:100%;font-size:1em;'>
                  <tr><td style='font-weight:600;'>Estado:</td><td>${status || '-'}</td></tr>`;
            if (status && status.toLowerCase().includes('cambio')) {
                content += `<tr><td style='font-weight:600;'>Solicitante:</td><td>${record?.solicitanteNombre || '-'}</td></tr>`;
            }
            if (extraHoursStr) {
                content += `<tr><td style='font-weight:600;'>Horas extras:</td><td>${extraHoursStr}</td></tr>`;
            }
            content += `</table>`;
            content += `<hr style='margin:0.7em 0 0.5em 0;border:0;border-top:1.5px solid #1976D2;'>`;
            content += `<div style='font-size:1em;'><b>Observaciones:</b><br>${obsFinal || obs || 'Sin observaciones'}</div>`;
            if (extraHoursStr) {
                content += `<div style='text-align:center;margin-top:1em;'><button id='restarHorasBtn' class='btn-secondary'>Restar horas extras</button></div>`;
            }
            body.innerHTML = content;
            modal.style.display = 'flex';

            // Botón para restar horas extras
            if (extraHoursStr) {
                setTimeout(() => {
                    const btn = document.getElementById('restarHorasBtn');
                    if (btn) {
                        btn.onclick = () => {
                            // Mostrar formulario para ingresar cantidad a restar
                            body.innerHTML += `
                                <div id='restarHorasForm' style='margin-top:1em;'>
                                    <label for='restarHorasInput'><b>¿Cuántas horas quieres restar?</b></label><br>
                                    <input type='text' id='restarHorasInput' placeholder='Ej: 1.5 o 1:30' style='margin:0.5em 0;padding:0.4em;width:80px;text-align:center;'>
                                    <button id='confirmRestarHorasBtn' class='btn-primary' style='margin-left:0.5em;'>Confirmar</button>
                                    <button id='cancelRestarHorasBtn' class='btn-secondary' style='margin-left:0.5em;'>Cancelar</button>
                                </div>
                            `;
                            document.getElementById('restarHorasBtn').style.display = 'none';
                            document.getElementById('cancelRestarHorasBtn').onclick = () => {
                                modal.style.display = 'none';
                            };
                            document.getElementById('confirmRestarHorasBtn').onclick = () => {
                                const val = document.getElementById('restarHorasInput').value.trim();
                                let horas = 0;
                                if (val.includes(':')) {
                                    // Formato h:mm
                                    const [h, m] = val.split(':').map(Number);
                                    if (!isNaN(h) && !isNaN(m)) horas = h + m/60;
                                } else {
                                    horas = parseFloat(val);
                                }
                                if (isNaN(horas) || horas <= 0) {
                                    alert('Ingrese una cantidad válida de horas.');
                                    return;
                                }
                                if (horas > extraHours) {
                                    if (!confirm('Estás restando más horas de las registradas en este día. ¿Deseas continuar?')) return;
                                }
                                this.restarHorasExtras(empObj.id, date, horas);
                                modal.style.display = 'none';
                            };
                        };
                    }
                }, 100);
            }

            // Aseguro que la cruz y el fondo cierren el modal
            const closeBtn = document.getElementById('closePlanillaModal');
            if (closeBtn) {
                closeBtn.onclick = (e) => {
                    modal.style.display = 'none';
                };
            }
            modal.onclick = (e) => {
                if (e.target === modal) modal.style.display = 'none';
            };
        }
    }

    // Nueva función para restar horas extras
    restarHorasExtras(employeeId, date, horas) {
        const emp = this.employees.find(e => e.id === employeeId);
        if (!emp) return;
        if (!emp.extraHoursSaldo) emp.extraHoursSaldo = 0;
        if (!emp.extraHoursHistorial) emp.extraHoursHistorial = [];
        emp.extraHoursSaldo -= horas;
        if (emp.extraHoursSaldo < 0) emp.extraHoursSaldo = 0;
        emp.extraHoursHistorial.push({
            tipo: 'resta',
            cantidad: horas,
            fecha: date,
            motivo: 'Descuento manual',
            timestamp: new Date().toISOString()
        });
        // --- NUEVO: Restar también en el registro de asistencia del día ---
        const attendanceKey = `${employeeId}_${date}`;
        const record = this.attendance[attendanceKey];
        if (record) {
            if (!record.extraHours) record.extraHours = 0;
            record.extraHours -= horas;
            if (record.extraHours < 0) record.extraHours = 0;
            this.attendance[attendanceKey] = record;
            this.saveToStorage('attendance', this.attendance);
        }
        // --- FIN NUEVO ---
        this.saveToStorage('employees', this.employees);
        this.showFeedbackMessage(`Se restaron ${horas} horas extras al empleado.`, 'success');
        this.renderEmployees();
    }

    // Exportación de planilla
    async exportPlanillaExcel() {
        try {
            const plantillaInput = document.getElementById('plantillaExcel');
            if (!plantillaInput || !plantillaInput.files || plantillaInput.files.length === 0) {
                alert('Por favor selecciona la plantilla Excel antes de exportar.');
                plantillaInput?.focus();
                return;
            }
            const file = plantillaInput.files[0];
            const reader = new FileReader();
            reader.onload = async (e) => {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const ws = workbook.Sheets[sheetName];
                const monthInput = document.getElementById('planillaMonth');
                if (!monthInput || !monthInput.value) {
                    alert('Seleccione un mes para exportar');
                    return;
                }
                const [year, month] = monthInput.value.split('-');
                const daysInMonth = new Date(year, month, 0).getDate();
                // Encabezados: Personal, Turno, 1, 2, ..., n
                const headers = ['Personal', 'Turno'];
                for (let day = 1; day <= daysInMonth; day++) {
                    headers.push(day.toString());
                }
                // Escribir encabezados en la primera fila
                for (let col = 0; col < headers.length; col++) {
                    const cell = XLSX.utils.encode_cell({ r: 0, c: col });
                    ws[cell] = { t: 's', v: headers[col] };
                }
                // Escribir datos de empleados
                this.employees.forEach((employee, idx) => {
                    const row = [
                        employee.name,
                        (employee.turno === 'SADOFE' ? 'SADOFE' : (employee.turno || ''))
                    ];
                    for (let day = 1; day <= daysInMonth; day++) {
                        const dateStr = `${year}-${month.padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
                        const record = this.getAttendanceRecord(employee.id, dateStr);
                        const code = this.getPlanillaCode(record);
                        row.push(code.code);
                    }
                    // Escribir fila en la hoja (idx+1 porque 0 es encabezado)
                    for (let col = 0; col < row.length; col++) {
                        const cell = XLSX.utils.encode_cell({ r: idx + 1, c: col });
                        ws[cell] = { t: 's', v: row[col] };
                    }
                });
                // Actualizar rango de la hoja
                ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: this.employees.length, c: headers.length - 1 } });
                // Descargar archivo
                XLSX.writeFile(workbook, `planilla-vigilancia-${year}-${month}.xlsx`);
                this.showFeedbackMessage('Planilla exportada correctamente.', 'success');
            };
            reader.readAsArrayBuffer(file);
        } catch (error) {
            console.error('Error al exportar a Excel:', error);
            this.showFeedbackMessage('Error al exportar a Excel.', 'error');
            alert('Error al exportar a Excel. Verifique su conexión a internet.');
        }
    }

    // Exportación de datos
    exportData() {
        const data = {
            employees: this.employees,
            attendance: this.attendance,
            exportDate: new Date().toISOString()
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `control-vigilancia-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        this.showFeedbackMessage('Datos exportados correctamente.', 'success');
    }

    exportReportToPDF(report) {
        // Implementación básica de PDF usando window.print()
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
                <head>
                    <title>Reporte de Vigilancia</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 20px; }
                        .header { text-align: center; margin-bottom: 30px; }
                        .summary { margin-bottom: 30px; }
                        .employee { margin-bottom: 20px; border-bottom: 1px solid #ccc; padding-bottom: 10px; }
                        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                        th { background-color: #f2f2f2; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1>Reporte de Control de Vigilancia</h1>
                        <p>Período: ${new Date(report.period.start).toLocaleDateString()} - ${new Date(report.period.end).toLocaleDateString()}</p>
                    </div>
                    <div class="summary">
                        <h2>Resumen General</h2>
                        <table>
                            <tr><th>Estado</th><th>Cantidad</th></tr>
                            ${(() => {
                                const shown = new Set();
                                return Object.entries(report.summary.byStatus)
                                    .filter(([status]) => status !== 'sin-asignar' && status !== 'no-registrado')
                                    .filter(([status]) => {
                                        if (status === 'carpeta_medica' || status === 'carpeta-medica') {
                                            if (shown.has('carpeta-medica')) return false;
                                            shown.add('carpeta-medica');
                                            return true;
                                        }
                                        if (status === 'A26') {
                                            if (shown.has('A26')) return false;
                                            shown.add('A26');
                                            return true;
                                        }
                                        if (shown.has(status)) return false;
                                        shown.add(status);
                                        return true;
                                    })
                                    .map(([status, count]) =>
                                        `<tr><td>${status === 'presente' ? 'Presente' : (status === 'A26' ? 'Artículo 26' : (status === 'carpeta_medica' || status === 'carpeta-medica' ? 'Carpeta Médica' : this.getStatusText(status)))}</td><td>${count}</td></tr>`
                                    ).join('');
                            })()}
                        </table>
                    </div>
                    <div class="details">
                        <h2>Detalle por Empleado</h2>
                        ${report.employees.map(employee => `
                            <div class="employee">
                                <h3>${employee.name} (${employee.position})</h3>
                                <table>
                                    <tr><th>Estado</th><th>Cantidad</th></tr>
                                    ${(() => {
                                        const shown = new Set();
                                        return Object.entries(employee.totals)
                                            .filter(([status, count]) => count > 0 && status !== 'no-registrado')
                                            .filter(([status]) => {
                                                if (status === 'carpeta_medica' || status === 'carpeta-medica') {
                                                    if (shown.has('carpeta-medica')) return false;
                                                    shown.add('carpeta-medica');
                                                    return true;
                                                }
                                                if (status === 'A26') {
                                                    if (shown.has('A26')) return false;
                                                    shown.add('A26');
                                                    return true;
                                                }
                                                if (shown.has(status)) return false;
                                                shown.add(status);
                                                return true;
                                            })
                                            .map(([status, count]) =>
                                                `<tr><td>${status === 'presente' ? 'Guardias realizadas' : (status === 'A26' ? 'Artículo 26' : (status === 'carpeta_medica' || status === 'carpeta-medica' ? 'Carpeta Médica' : this.getStatusText(status)))}</td><td>${count}</td></tr>`
                                            ).join('');
                                    })()}
                                </table>
                            </div>
                        `).join('')}
                    </div>
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.print();
    }

    async exportPlanillaIMG() {
        try {
            if (typeof html2canvas === 'undefined') {
                await new Promise((resolve, reject) => {
                    const script = document.createElement('script');
                    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
                    script.onload = resolve;
                    script.onerror = reject;
                    document.head.appendChild(script);
                });
            }
            const monthInput = document.getElementById('planillaMonth');
            if (!monthInput || !monthInput.value) {
                alert('Seleccione un mes para exportar');
                return;
            }
            const [year, month] = monthInput.value.split('-');
            const monthName = new Date(year, month - 1).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
            // Solo exportar la tabla filtrada
            const tablaContainer = document.querySelector('.planilla-table-container');
            if (!tablaContainer) {
                alert('No se encontró la tabla de la planilla.');
                return;
            }
            const tabla = tablaContainer.querySelector('.planilla-table');
            if (tabla) {
                tabla.style.border = '1.5px solid #333';
                tabla.style.borderCollapse = 'collapse';
                tabla.querySelectorAll('th, td').forEach(cell => {
                    cell.style.border = '1.5px solid #333';
                });
            }
            const canvas = await html2canvas(tablaContainer, { scale: 2 });
            const link = document.createElement('a');
            link.download = `planilla-vigilancia-${monthName}.png`;
            link.href = canvas.toDataURL();
            link.click();
        } catch (error) {
            console.error('Error al exportar como imagen:', error);
            alert('Error al exportar como imagen. Verifique su conexión a internet.');
        }
    }

    // Almacenamiento local
    saveToStorage(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (error) {
            console.error('Error al guardar en localStorage:', error);
        }
    }

    loadFromStorage(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('Error al cargar desde localStorage:', error);
            return null;
        }
    }

    // Lógica para el Libro de Novedades
    abrirLibroEmpleado(employeeId) {
        this.switchView('libro');
        // Seleccionar el año actual por defecto
        const year = document.getElementById('libroYear')?.value || (new Date().getFullYear().toString());
        this.selectedLibroEmpleadoId = employeeId;
        this.renderLibroEmpleadoSelector(employeeId);
        this.renderLibroHistorial(employeeId, year);
    }
    setupLibroView() {
        // Llenar años disponibles
        const yearSelect = document.getElementById('libroYear');
        if (yearSelect) {
            const years = [];
            const now = new Date();
            for(let y=now.getFullYear(); y>=now.getFullYear()-5; y--) years.push(y);
            yearSelect.innerHTML = years.map(y=>`<option value="${y}">${y}</option>`).join('');
        }
        // Buscar empleados
        const searchInput = document.getElementById('libroEmpleadoSearch');
        if (searchInput) searchInput.addEventListener('input', () => this.renderLibroEmpleadoSelector());
        if (yearSelect) yearSelect.addEventListener('change', () => this.renderLibroEmpleadoSelector());
        this.renderLibroEmpleadoSelector();
    }
    renderLibroEmpleadoSelector(selectedId) {
        const container = document.getElementById('libroEmpleadoSelector');
        const search = document.getElementById('libroEmpleadoSearch')?.value.trim().toLowerCase() || '';
        const year = document.getElementById('libroYear')?.value || (new Date().getFullYear().toString());
        let filtered = this.employees;
        if (search) {
            filtered = filtered.filter(emp => emp.name.toLowerCase().includes(search));
        }
        if (filtered.length === 0) {
            container.innerHTML = '<div class="summary-item">No hay empleados que coincidan.</div>';
            document.getElementById('libroHistorial').innerHTML = '';
            document.getElementById('libroResumen').innerHTML = '';
            return;
        }
        if (typeof this.selectedLibroEmpleadoId === 'undefined') this.selectedLibroEmpleadoId = null;
        container.innerHTML = filtered.map(emp =>
            `<button class="btn-primary btn-small" style="margin:0.2em 0.5em 0.2em 0;${this.selectedLibroEmpleadoId===emp.id?'background:#1976D2;color:#fff;':''}" onclick="app.toggleLibroEmpleado('${emp.id}', '${year}')">${emp.name}</button>`
        ).join('');
        // Si hay uno seleccionado, mostrar su historial
        if (this.selectedLibroEmpleadoId) this.renderLibroHistorial(this.selectedLibroEmpleadoId, year);
    }
    toggleLibroEmpleado(employeeId, year) {
        if (this.selectedLibroEmpleadoId === employeeId) {
            // Cerrar
            this.selectedLibroEmpleadoId = null;
            document.getElementById('libroHistorial').innerHTML = '';
            document.getElementById('libroResumen').innerHTML = '';
        } else {
            // Abrir
            this.selectedLibroEmpleadoId = employeeId;
            this.renderLibroEmpleadoSelector(employeeId);
        }
    }
    renderLibroHistorial(employeeId, year) {
        const historialDiv = document.getElementById('libroHistorial');
        const resumenDiv = document.getElementById('libroResumen');
        const empleado = this.employees.find(e=>e.id===employeeId);
        if (!empleado) {
            historialDiv.innerHTML = '<div class="summary-item">Empleado no encontrado.</div>';
            resumenDiv.innerHTML = '';
            return;
        }
        // Recolectar todas las novedades del año
        let rows = [];
        let totales = {};
        for(let m=1;m<=12;m++){
            const daysInMonth = new Date(year, m, 0).getDate();
            for(let d=1;d<=daysInMonth;d++){
                const dateStr = `${year}-${m.toString().padStart(2,'0')}-${d.toString().padStart(2,'0')}`;
                const rec = this.attendance[`${employeeId}_${dateStr}`];
                if(rec){
                    const status = rec.status;
                    totales[status] = (totales[status]||0)+1;
                    let obs = rec.observations||'';
                    if (status === 'cambio-guardia') {
                        let compName = '';
                        if (rec.companionId) {
                            const comp = this.employees.find(e=>e.id===rec.companionId);
                            compName = comp ? comp.name : '';
                        }
                        obs = `Tipo: ${rec.shiftChangeType==='con-companero'?'Con Compañero':'Solo'}` + (compName?`<br>Compañero: ${compName}`:'') + (rec.shiftChangeStart?`<br>Fecha cambio: ${rec.shiftChangeStart}`:'') + (rec.shiftChangeEnd?`<br>Fecha devolución: ${rec.shiftChangeEnd}`:'');
                    }
                    rows.push({
                        fecha: dateStr,
                        status: this.getStatusText(status),
                        observaciones: obs
                    });
                }
            }
        }
        // Integrar movimientos de horas extras
        if (empleado.extraHoursHistorial && Array.isArray(empleado.extraHoursHistorial)) {
            empleado.extraHoursHistorial.forEach(mov => {
                const h = Math.floor(mov.cantidad);
                const m = Math.round((mov.cantidad - h) * 60);
                const cantidadStr = `${h}:${m.toString().padStart(2, '0')}`;
                rows.push({
                    fecha: mov.fecha,
                    status: mov.tipo === 'suma' ? '⏫ Horas extras sumadas' : '⏬ Horas extras restadas',
                    observaciones: `${mov.motivo || ''} (${cantidadStr} hs)`
                });
            });
        }
        // Ordenar por fecha descendente
        rows.sort((a, b) => b.fecha.localeCompare(a.fecha));
        if (rows.length === 0) {
            historialDiv.innerHTML = '<div class="summary-item">No hay novedades registradas para este año.</div>';
            resumenDiv.innerHTML = '';
            return;
        }
        // Tabla de historial
        let html = `<table style='width:100%;border-collapse:collapse;font-size:0.97em;'><thead><tr><th style='padding:0.3em 0.7em;'>Fecha</th><th style='padding:0.3em 0.7em;'>Estado</th><th style='padding:0.3em 0.7em;'>Observaciones</th></tr></thead><tbody>`;
        let lastFecha = null;
        rows.forEach((r, idx)=>{
            let style = '';
            if (r.status.includes('⏫')) style = "color:#388e3c;font-weight:600;";
            if (r.status.includes('⏬')) style = "color:#c62828;font-weight:600;";
            // Línea divisoria solo si la fecha es distinta a la anterior y no es la primera fila
            let borderStyle = (idx > 0 && r.fecha !== lastFecha) ? "border-top:2px solid #333;" : "";
            // Formatear fecha a DD/MM/AA
            let fechaFormateada = r.fecha;
            if (/^\d{4}-\d{2}-\d{2}$/.test(r.fecha)) {
                const [y, m, d] = r.fecha.split('-');
                fechaFormateada = `${d}/${m}/${y.slice(2)}`;
            }
            // Formatear fechas dentro de observaciones si existen
            let obsFormateada = r.observaciones;
            if (obsFormateada && typeof obsFormateada === 'string') {
                obsFormateada = obsFormateada.replace(/(Fecha cambio: )([0-9]{4}-[0-9]{2}-[0-9]{2})/g, (match, p1, p2) => {
                    const [y, m, d] = p2.split('-');
                    return `${p1}${d}/${m}/${y.slice(2)}`;
                });
                obsFormateada = obsFormateada.replace(/(Fecha devolución: )([0-9]{4}-[0-9]{2}-[0-9]{2})/g, (match, p1, p2) => {
                    const [y, m, d] = p2.split('-');
                    return `${p1}${d}/${m}/${y.slice(2)}`;
                });
                // Mostrar solicitante SIEMPRE al principio si existe y es cambio de guardia
                if (r.status && r.status.toLowerCase().includes('cambio') && r.solicitanteNombre) {
                    obsFormateada = `<b>Solicitante:</b> ${r.solicitanteNombre}` + (obsFormateada ? '<br>' + obsFormateada : '');
                }
            }
            html += `<tr style='${borderStyle}'><td style='padding:0.3em 0.7em;'>${fechaFormateada}</td><td style='padding:0.3em 0.7em;${style}'>${r.status}</td><td style='padding:0.3em 0.7em;'>${obsFormateada}</td></tr>`;
            lastFecha = r.fecha;
        });
        html += '</tbody></table>';
        historialDiv.innerHTML = `<h4 style='margin-bottom:0.7em;'>${empleado.name} (${empleado.position||''})</h4>`+html;
        // Resumen
        let totalRegistros = rows.length;
        let resumenHtml = `<h4 style='margin-bottom:0.5em;'>Resumen anual</h4><ul style='padding-left:1.2em;'>`;
        const diasVacaciones = totales['vacaciones'] || 0;
        const diasEstres = totales['estres'] || 0;
        resumenHtml += `<li>Días de vacaciones tomados: <b>${diasVacaciones}</b></li>`;
        resumenHtml += `<li>Días de estrés tomados: <b>${diasEstres}</b></li>`;
        Object.entries(totales).forEach(([status, count])=>{
            resumenHtml += `<li>${this.getStatusText(status)}: <b>${count}</b> (${Math.round((count/totalRegistros)*100)}%)</li>`;
        });
        resumenHtml += `</ul>`;
        // Agregar total de horas extras acumuladas
        let saldo = empleado.extraHoursSaldo || 0;
        let saldoStr = '';
        if (saldo > 0) {
            const h = Math.floor(saldo);
            const m = Math.round((saldo - h) * 60);
            saldoStr = `<div style='margin-top:0.7em;font-size:1.05em;color:#1976D2;font-weight:600;'>Total de horas extras acumuladas: <span style='color:#00b2c6;'>${h}:${m.toString().padStart(2, '0')} hs</span></div>`;
        }
        resumenHtml += saldoStr;
        resumenHtml += `<div style='margin-top:1em;font-size:0.95em;color:#555;'>Total de novedades: <b>${totalRegistros}</b></div>`;
        resumenDiv.innerHTML = resumenHtml;
    }

    generateControlReport() {
        const startDate = document.getElementById('controlStartDate')?.value;
        const endDate = document.getElementById('controlEndDate')?.value;
        const employeeId = document.getElementById('controlEmployeeSelect')?.value;
        
        if (!startDate || !endDate) {
            alert('Por favor seleccione un rango de fechas');
            return;
        }
        
        let employees = this.employees;
        if (employeeId) {
            employees = employees.filter(e => e.id === employeeId);
        }
        
        const container = document.getElementById('controlResults');
        if (!container) return;
        
        let html = `
            <div class="control-report-header">
                <h3>Reporte de Control</h3>
                <p><strong>Período:</strong> ${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}</p>
            </div>
        `;
        
        employees.forEach(employee => {
            const controlData = this.getEmployeeControlData(employee.id, startDate, endDate);
            const diasVacacionesDisponibles = employee.diasVacacionesDisponibles || 0;
            const diasEstresDisponibles = employee.diasEstresDisponibles || 0;
            const diasCompensatoriosDisponibles = employee.diasCompensatoriosDisponibles || 0;
            const diasVacacionesRestantes = diasVacacionesDisponibles - controlData.vacaciones;
            const diasEstresRestantes = diasEstresDisponibles - controlData.estres;
            const diasCompensatoriosRestantes = diasCompensatoriosDisponibles - controlData.compensatorios;
            
            // NUEVO: Calcular días restantes de Artículo 26
            const currentYear = new Date().getFullYear();
            const articulo26Anio = this.getArticulo26Anio(employee.id, currentYear);
            const articulo26Restantes = 6 - articulo26Anio;
            
            html += `
                <div class="employee-control-card">
                    <h4>${employee.name}</h4>
                    <div class="control-summary">
                        <div class="control-item">
                            <span class="control-label">Vacaciones:</span>
                            <span class="control-value">${controlData.vacaciones} / ${diasVacacionesDisponibles} días</span>
                            <span class="control-remaining">(${diasVacacionesRestantes} restantes)</span>
                        </div>
                        <div class="control-item">
                            <span class="control-label">Estrés:</span>
                            <span class="control-value">${controlData.estres} / ${diasEstresDisponibles} días</span>
                            <span class="control-remaining">(${diasEstresRestantes} restantes)</span>
                        </div>
                        <div class="control-item">
                            <span class="control-label">Compensatorios:</span>
                            <span class="control-value">${controlData.compensatorios} / ${diasCompensatoriosDisponibles} días</span>
                            <span class="control-remaining">(${diasCompensatoriosRestantes} restantes)</span>
                        </div>
                        <div class="control-item">
                            <span class="control-label">Artículo 26:</span>
                            <span class="control-value">${controlData.articulo26} / 6 días (anual)</span>
                            <span class="control-remaining">(${articulo26Restantes} restantes)</span>
                        </div>
                        <div class="control-item">
                            <span class="control-label">Horas Extras:</span>
                            <span class="control-value">${controlData.horasExtras}</span>
                        </div>
                    </div>
                    <div class="control-actions">
                        <button class="btn-secondary config-btn" data-employee-id="${employee.id}" onclick="app.openControlConfig('${employee.id}')">
                            Configurar Días
                        </button>
                    </div>
                    <div class="control-details">
                        <h5>Detalle de Movimientos</h5>
                        ${controlData.movimientos.length > 0 ? 
                            controlData.movimientos.map(mov => `
                                <div class="movement-item">
                                    <span class="movement-date">${new Date(mov.fecha).toLocaleDateString()}</span>
                                    <span class="movement-type">${mov.tipo}</span>
                                    <span class="movement-amount">${mov.cantidad}</span>
                                    <span class="movement-reason">${mov.motivo}</span>
                                </div>
                            `).join('') : 
                            '<p>No hay movimientos en este período</p>'
                        }
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
    }
    
    getEmployeeControlData(employeeId, startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
        
        let vacaciones = 0;
        let estres = 0;
        let compensatorios = 0;
        let articulo26 = 0;
        let horasExtras = 0;
        const movimientos = [];
        
        // Contar días por estado
        for (let i = 0; i < daysDiff; i++) {
            const currentDate = new Date(start);
            currentDate.setDate(start.getDate() + i);
            const dateStr = currentDate.toISOString().split('T')[0];
            
            const record = this.getAttendanceRecord(employeeId, dateStr);
            if (record) {
                switch(record.status) {
                    case 'vacaciones':
                        vacaciones++;
                        movimientos.push({
                            fecha: dateStr,
                            tipo: 'Vacaciones',
                            cantidad: '1 día',
                            motivo: record.observations || 'Sin observaciones'
                        });
                        break;
                    case 'estres':
                        estres++;
                        movimientos.push({
                            fecha: dateStr,
                            tipo: 'Estrés',
                            cantidad: '1 día',
                            motivo: record.observations || 'Sin observaciones'
                        });
                        break;
                    case 'compensatorio':
                        compensatorios++;
                        movimientos.push({
                            fecha: dateStr,
                            tipo: 'Compensatorio',
                            cantidad: '1 día',
                            motivo: record.observations || 'Sin observaciones'
                        });
                        break;
                    case 'A26':
                        articulo26++;
                        movimientos.push({
                            fecha: dateStr,
                            tipo: 'Artículo 26',
                            cantidad: '1 día',
                            motivo: record.observations || 'Sin observaciones'
                        });
                        break;
                }
            }
        }
        
        // Calcular horas extras del empleado
        const employee = this.employees.find(e => e.id === employeeId);
        if (employee && employee.extraHoursSaldo) {
            horasExtras = employee.extraHoursSaldo;
            const h = Math.floor(horasExtras);
            const m = Math.round((horasExtras - h) * 60);
            horasExtras = `${h}:${m.toString().padStart(2, '0')} hs`;
        } else {
            horasExtras = '0:00 hs';
        }
        
        // Agregar movimientos de horas extras
        if (employee && employee.extraHoursHistorial) {
            employee.extraHoursHistorial.forEach(mov => {
                const movDate = new Date(mov.fecha);
                if (movDate >= start && movDate <= end) {
                    const h = Math.floor(mov.cantidad);
                    const m = Math.round((mov.cantidad - h) * 60);
                    const cantidadStr = `${h}:${m.toString().padStart(2, '0')} hs`;
                    movimientos.push({
                        fecha: mov.fecha,
                        tipo: mov.tipo === 'suma' ? '⏫ Horas Extras' : '⏬ Descuento Horas',
                        cantidad: cantidadStr,
                        motivo: mov.motivo
                    });
                }
            });
        }
        
        // Ordenar movimientos por fecha
        movimientos.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
        
        return {
            vacaciones,
            estres,
            compensatorios,
            articulo26,
            horasExtras,
            movimientos
        };
    }

    setupControlView() {
        const select = document.getElementById('controlEmployeeSelect');
        if (select) {
            select.innerHTML = '<option value="">Todos</option>' + this.employees.map(emp => `<option value="${emp.id}">${emp.name}</option>`).join('');
        }
        
        // Configurar fechas por defecto (último mes)
        const controlStartDate = document.getElementById('controlStartDate');
        const controlEndDate = document.getElementById('controlEndDate');
        if (controlStartDate && controlEndDate) {
            const lastMonth = new Date();
            lastMonth.setMonth(lastMonth.getMonth() - 1);
            const lastMonthYear = lastMonth.getFullYear();
            const lastMonthMonth = (lastMonth.getMonth() + 1).toString().padStart(2, '0');
            const lastMonthDay = lastMonth.getDate().toString().padStart(2, '0');
            controlStartDate.value = `${lastMonthYear}-${lastMonthMonth}-${lastMonthDay}`;
            
            const now = new Date();
            const nowYear = now.getFullYear();
            const nowMonth = (now.getMonth() + 1).toString().padStart(2, '0');
            const nowDay = now.getDate().toString().padStart(2, '0');
            controlEndDate.value = `${nowYear}-${nowMonth}-${nowDay}`;
        }
    }

    openControlConfig(employeeId) {
        const employee = this.employees.find(e => e.id === employeeId);
        if (!employee) return;
        
        const configDiv = document.getElementById('controlConfig');
        const vacacionesInput = document.getElementById('vacacionesDisponibles');
        const estresInput = document.getElementById('estresDisponibles');
        const compensatoriosInput = document.getElementById('compensatoriosDisponibles');
        const articulo26Input = document.getElementById('articulo26Disponibles');
        
        if (configDiv && vacacionesInput && estresInput && compensatoriosInput && articulo26Input) {
            vacacionesInput.value = employee.diasVacacionesDisponibles || 0;
            estresInput.value = employee.diasEstresDisponibles || 0;
            compensatoriosInput.value = employee.diasCompensatoriosDisponibles || 0;
            
            // NUEVO: Calcular días restantes de Artículo 26 para el año actual
            const currentYear = new Date().getFullYear();
            const articulo26Usados = this.getArticulo26Anio(employeeId, currentYear);
            const articulo26Restantes = 6 - articulo26Usados;
            articulo26Input.value = articulo26Restantes;
            
            // Guardar el ID del empleado en el botón para usarlo al guardar
            const saveBtn = document.getElementById('saveConfigBtn');
            if (saveBtn) {
                saveBtn.dataset.employeeId = employeeId;
            }
            
            configDiv.style.display = 'block';
            configDiv.scrollIntoView({ behavior: 'smooth' });
        }
    }
    
    saveControlConfig() {
        const saveBtn = document.getElementById('saveConfigBtn');
        const employeeId = saveBtn?.dataset.employeeId;
        const vacacionesInput = document.getElementById('vacacionesDisponibles');
        const estresInput = document.getElementById('estresDisponibles');
        const compensatoriosInput = document.getElementById('compensatoriosDisponibles');
        const articulo26Input = document.getElementById('articulo26Disponibles');
        
        if (!employeeId || !vacacionesInput || !estresInput || !compensatoriosInput || !articulo26Input) return;
        
        const employee = this.employees.find(e => e.id === employeeId);
        if (!employee) return;
        
        const diasVacaciones = parseInt(vacacionesInput.value) || 0;
        const diasEstres = parseInt(estresInput.value) || 0;
        const diasCompensatorios = parseInt(compensatoriosInput.value) || 0;
        
        employee.diasVacacionesDisponibles = diasVacaciones;
        employee.diasEstresDisponibles = diasEstres;
        employee.diasCompensatoriosDisponibles = diasCompensatorios;
        
        this.saveToStorage('employees', this.employees);
        this.showFeedbackMessage('Configuración guardada correctamente.', 'success');
        
        // Ocultar configuración y actualizar reporte
        const configDiv = document.getElementById('controlConfig');
        if (configDiv) {
            configDiv.style.display = 'none';
        }
        
        // Regenerar reporte si hay fechas seleccionadas
        const startDate = document.getElementById('controlStartDate')?.value;
        const endDate = document.getElementById('controlEndDate')?.value;
        if (startDate && endDate) {
            this.generateControlReport();
        }
    }
}

// Inicializar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    // Esperar un poco más para asegurar que todo esté cargado
    setTimeout(() => {
        try {
            // Verificar que los elementos principales existan antes de inicializar
            const mainContainer = document.querySelector('.app-container');
            if (!mainContainer) {
                console.error('❌ Error: No se encontró el contenedor principal .app-container');
                return;
            }
            
            window.app = new VigilanciaApp();
            console.log('✅ Aplicación inicializada correctamente');
        } catch (error) {
            console.error('❌ Error al inicializar la aplicación:', error);
            console.error('Stack trace:', error.stack);
        }
    }, 200);
});

// Registrar Service Worker para PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        // Verificar si estamos en un contexto válido para Service Workers
        if (window.location.protocol === 'file:') {
            console.log('⚠️ Service Worker no disponible: Abriendo desde archivo local');
            console.log('💡 Para usar todas las funciones, ejecuta el servidor Python y abre http://localhost:8080');
            return;
        }
        
        navigator.serviceWorker.register('sw.js')
            .then(registration => {
                console.log('✅ SW registrado: ', registration);
            })
            .catch(registrationError => {
                console.log('❌ SW registro falló: ', registrationError);
                // Mostrar mensaje amigable en la consola
                if (registrationError.message.includes('URL protocol')) {
                    console.log('💡 Para usar todas las funciones, ejecuta el servidor Python y abre http://localhost:8080');
                }
            });
    });
}