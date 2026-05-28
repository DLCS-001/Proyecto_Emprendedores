// app.js - Sistema de Pedidos Restaurante (Versión Profesional)
(function(){
    const STORAGE_KEY = 'restaurantOrders';
    const STATE_ORDER = ['pendiente', 'preparacion', 'listo', 'entregado'];
    let currentRole = '';
    let currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
    let orders = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    let drake = null;
    let charts = {};

    // Elementos DOM
    const loginScreen = document.getElementById('login-screen');
    const dashboardScreen = document.getElementById('dashboard-screen');
    const roleBadge = document.getElementById('role-badge');
    const roleBadgeMobile = document.getElementById('role-badge-mobile');
    const searchInput = document.getElementById('search-input');
    const searchInputMobile = document.getElementById('search-input-mobile');
    const mesaFilter = document.getElementById('mesa-filter');
    const mesaFilterMobile = document.getElementById('mesa-filter-mobile');
    const reloadBtn = document.getElementById('reload-history');
    const reloadBtnMobile = document.getElementById('reload-history-mobile');
    const logoutBtn = document.getElementById('logout-button');
    const logoutBtnMobile = document.getElementById('logout-button-mobile');
    const darkToggle = document.getElementById('darkModeToggle');
    const darkToggleMobile = document.getElementById('darkModeToggleMobile');
    const historyBtn = document.getElementById('history-btn');
    const historyBtnMobile = document.getElementById('history-btn-mobile');
    const statsBtn = document.getElementById('stats-btn');
    const statsBtnMobile = document.getElementById('stats-btn-mobile');
    const columns = {
        pendiente: document.getElementById('pendiente-column'),
        preparacion: document.getElementById('preparacion-column'),
        listo: document.getElementById('listo-column'),
        entregado: document.getElementById('entregado-column')
    };
    const badges = {};
    const totals = {};
    STATE_ORDER.forEach(s => { 
        badges[s] = document.getElementById(`badge-${s}`); 
        totals[s] = document.getElementById(`count-${s}`);
    });

    // Solicitar permisos de notificación
    if ("Notification" in window && Notification.permission !== "granted" && Notification.permission !== "denied") {
        Notification.requestPermission();
    }

    // Funciones auxiliares
    function saveOrders() { 
        localStorage.setItem(STORAGE_KEY, JSON.stringify(orders)); 
    }
    
    function showToast(msg) { 
        const nt = document.getElementById('notification-text'); 
        if (nt) nt.textContent = msg; 
        const toast = document.getElementById('notification'); 
        toast.classList.add('show'); 
        setTimeout(() => toast.classList.remove('show'), 2500); 
    }
    
    function playSound() { 
        try { 
            document.getElementById('notification-sound').play(); 
        } catch(e) {} 
    }
    
    function sendNotification(title, body) {
        if ("Notification" in window && Notification.permission === "granted") {
            new Notification(title, { body, icon: "https://cdn-icons-png.flaticon.com/512/1046/1046784.png" });
        }
    }
    
    function getTimeAgo(isoDate) { 
        const diff = (Date.now() - new Date(isoDate)) / 1000 / 60; 
        if (diff < 1) return 'recién ahora'; 
        if (diff < 60) return `hace ${Math.floor(diff)} min`; 
        return `hace ${Math.floor(diff/60)} h`; 
    }
    
    function formatDateTime(iso) { 
        return new Date(iso).toLocaleString('es-ES', { 
            hour: '2-digit', 
            minute: '2-digit', 
            day: '2-digit', 
            month: 'short' 
        }); 
    }
    
    function calcularTiempoEstimado(platos) {
        const tiempoBase = 3; // minutos base
        const tiempoPorPlato = 2;
        return tiempoBase + (platos.length * tiempoPorPlato);
    }
    
    function visibleStates() { 
        if (currentRole === 'mesero') return ['pendiente', 'preparacion'];
        if (currentRole === 'chef') return ['preparacion', 'listo', 'entregado'];
        if (currentRole === 'servicio') return ['listo', 'entregado'];
        return STATE_ORDER;
    }
    
    function cardAllowsAction(order) { 
        if (currentRole === 'mesero') return order.estado === 'pendiente';
        if (currentRole === 'chef') return ['pendiente', 'preparacion'].includes(order.estado);
        if (currentRole === 'servicio') return order.estado === 'listo';
        return false;
    }
    
    function matchesSearch(order, query) { 
        if (!query) return true; 
        const haystack = `${order.id} mesa ${order.mesa} ${order.platos.map(p=>p.nombre).join(' ')} ${order.notas || ''}`.toLowerCase(); 
        return haystack.includes(query); 
    }
    
    function filteredOrders() { 
        const q = (searchInput.value || searchInputMobile.value || '').trim().toLowerCase(); 
        const mesa = mesaFilter.value || mesaFilterMobile.value || ''; 
        return orders.filter(o => matchesSearch(o, q) && (mesa === '' || o.mesa == mesa)); 
    }

    function getRoleLabel(role) {
        return { mesero: 'Mesero', chef: 'Chef', servicio: 'Servicio al cliente' }[role] || role;
    }

    async function loginRole(role) {
        const label = getRoleLabel(role);
        const result = await Swal.fire({
            title: `Iniciar sesión - ${label}`,
            html: `
                <input id="login-user" class="swal2-input" placeholder="Usuario">
                <input id="login-password" type="password" class="swal2-input" placeholder="Contraseña">
            `,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'Entrar',
            cancelButtonText: 'Cancelar',
            preConfirm: () => {
                const usuario = document.getElementById('login-user').value.trim();
                const password = document.getElementById('login-password').value.trim();
                if (!usuario || !password) {
                    Swal.showValidationMessage('Ingresa usuario y contraseña');
                    return false;
                }
                return { usuario, role };
            }
        });

        if (!result.isConfirmed) return null;
        localStorage.setItem('currentUser', JSON.stringify(result.value));
        return result.value;
    }

    function updateMesaFilter() {
        const mesas = [...new Set(orders.map(o => o.mesa))].sort((a,b) => a-b);
        const options = '<option value="">Todas las mesas</option>' + mesas.map(m => `<option value="${m}">Mesa ${m}</option>`).join('');
        mesaFilter.innerHTML = options;
        mesaFilterMobile.innerHTML = options;
    }

    function escapeHtml(str) { 
        if (!str) return ''; 
        return str.replace(/[&<>]/g, function(m) { 
            if (m === '&') return '&amp;'; 
            if (m === '<') return '&lt;'; 
            if (m === '>') return '&gt;'; 
            return m;
        }); 
    }

    // Renderizado de tarjeta
    function renderOrderCard(order) {
        const meta = { 
            pendiente: { label:'Pendiente', dot:'bg-amber-500', cls:'bg-amber-100 text-amber-800' },
            preparacion: { label:'En preparación', dot:'bg-orange-500', cls:'bg-orange-100 text-orange-800' },
            listo: { label:'Listo', dot:'bg-emerald-500', cls:'bg-emerald-100 text-emerald-800' },
            entregado: { label:'Entregado', dot:'bg-sky-500', cls:'bg-sky-100 text-sky-800' }
        }[order.estado];
        
        const canDrag = cardAllowsAction(order);
        const isEditable = (currentRole === 'mesero' && order.estado === 'pendiente');
        const dishes = order.platos.map(p => `
            <li class="flex justify-between">
                <span>${escapeHtml(p.nombre)}</span>
                <span class="font-medium">x${p.cantidad}</span>
            </li>
        `).join('');
        const tiempoEst = calcularTiempoEstimado(order.platos);
        const rating = order.valoracion ? `
            <div class="mt-2 text-xs rating-summary">
                ${'★'.repeat(order.valoracion.estrellas)}${'☆'.repeat(5 - order.valoracion.estrellas)}
                <span>${escapeHtml(order.valoracion.mensaje)}</span>
            </div>
        ` : '';
        
        return `
            <article class="order-card p-4 shadow-sm ${canDrag ? 'cursor-grab' : ''}" data-order-id="${order.id}">
                <div class="flex justify-between items-start">
                    <div>
                        <div class="font-bold">Orden #${order.id} - Mesa ${order.mesa}</div>
                        <div class="text-xs opacity-70 mt-1">
                            <i class="fa-regular fa-clock"></i> ${formatDateTime(order.createdAt)} 
                            <span class="time-badge">${getTimeAgo(order.createdAt)}</span>
                        </div>
                    </div>
                    <span class="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full border ${meta.cls}">
                        <span class="status-dot ${meta.dot}"></span>${meta.label}
                    </span>
                </div>
                ${order.notas ? `<div class="mt-2 text-xs bg-yellow-50 dark:bg-yellow-900/30 p-1 rounded"><i class="fa-regular fa-note-sticky"></i> ${escapeHtml(order.notas)}</div>` : ''}
                ${rating}
                <div class="my-2 border-t"></div>
                <ul class="text-sm space-y-1">${dishes}</ul>
                <div class="mt-2 flex justify-between items-center">
                    <span class="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                        <i class="fa-regular fa-hourglass-half"></i> ⏱️ ${tiempoEst} min
                    </span>
                </div>
                <div class="mt-3 flex gap-2 flex-wrap">
                    ${isEditable ? `<button data-action="editar" data-order-id="${order.id}" class="text-xs bg-indigo-100 dark:bg-indigo-900 px-3 py-1 rounded-full"><i class="fa-regular fa-pen-to-square"></i> Editar</button>` : ''}
                    ${currentRole === 'mesero' && order.estado === 'pendiente' ? `<button data-action="cancelar" data-order-id="${order.id}" class="text-xs bg-rose-100 dark:bg-rose-900 px-3 py-1 rounded-full"><i class="fa-regular fa-trash-can"></i> Cancelar</button>` : ''}
                    ${currentRole === 'chef' && order.estado === 'pendiente' ? `<button data-action="preparar" data-order-id="${order.id}" class="text-xs bg-orange-500 text-white px-3 py-1 rounded-full">Comenzar</button>` : ''}
                    ${currentRole === 'chef' && order.estado === 'preparacion' ? `<button data-action="listo" data-order-id="${order.id}" class="text-xs bg-emerald-500 text-white px-3 py-1 rounded-full">Marcar listo</button>` : ''}
                    ${currentRole === 'servicio' && order.estado === 'listo' ? `<button data-action="entregar" data-order-id="${order.id}" class="text-xs bg-sky-500 text-white px-3 py-1 rounded-full">Entregar</button>` : ''}
                </div>
            </article>`;
    }

    function renderColumns() {
        const list = filteredOrders();
        for (let st of STATE_ORDER) {
            let count = list.filter(o => o.estado === st).length;
            if (totals[st]) totals[st].innerText = count;
            if (badges[st]) badges[st].innerText = count;
        }
        const visible = visibleStates();
        document.querySelectorAll('[data-board-state]').forEach(column => {
            column.classList.toggle('hidden', !visible.includes(column.dataset.boardState));
        });
        for (let st of STATE_ORDER) {
            const filtered = list.filter(o => o.estado === st && visible.includes(st));
            const html = filtered.length 
                ? filtered.map(renderOrderCard).join('') 
                : `<div class="p-6 text-center opacity-60 border border-dashed rounded-2xl">
                     <i class="fa-regular fa-rectangle-list"></i> Sin órdenes
                   </div>`;
            columns[st].innerHTML = html;
        }
        if (currentRole === 'chef') initDragAndDrop(); 
        else destroyDragAndDrop();
        actualizarEstadisticas(); // actualizar gráficos si el modal está abierto
    }

    // Drag & drop
    function destroyDragAndDrop() { 
        if (drake) { 
            drake.destroy(); 
            drake = null; 
        } 
    }
    
    function initDragAndDrop() {
        destroyDragAndDrop();
        drake = dragula([columns.pendiente, columns.preparacion, columns.listo], {
            moves: (el) => el.classList.contains('order-card'),
            accepts: (el, target) => target !== columns.entregado
        });
        drake.on('drop', (el, target) => {
            let orderId = Number(el.dataset.orderId);
            let newState = null;
            if (target === columns.pendiente) newState = 'pendiente';
            else if (target === columns.preparacion) newState = 'preparacion';
            else if (target === columns.listo) newState = 'listo';
            if (newState) cambiarEstadoOrden(orderId, newState, true);
        });
    }

    function cambiarEstadoOrden(orderId, nuevoEstado, silent = false) {
        const idx = orders.findIndex(o => o.id === orderId);
        if (idx === -1) return;
        const old = orders[idx].estado;
        orders[idx].estado = nuevoEstado;
        saveOrders();
        if (nuevoEstado === 'listo' && old !== 'listo') {
            playSound();
            const orden = orders[idx];
            sendNotification(`Orden #${orderId} lista`, `Mesa ${orden.mesa} - ${orden.platos.map(p=>p.nombre).join(', ')}`);
        }
        renderColumns();
        if (!silent) {
            Swal.fire({ icon: 'success', title: 'Estado actualizado', text: `Orden #${orderId} → ${nuevoEstado}`, timer: 1500, showConfirmButton: false });
        } else {
            showToast(`Orden #${orderId} movida a ${nuevoEstado}`);
        }
    }

    function mensajeValoracion(estrellas) {
        if (estrellas >= 5) return 'Excelente servicio, gracias por tu valoración.';
        if (estrellas === 4) return 'Muy buen servicio, seguiremos mejorando.';
        if (estrellas === 3) return 'Gracias por tu opinión, tomaremos nota.';
        if (estrellas === 2) return 'Lamentamos que no fuera ideal, revisaremos el servicio.';
        return 'Gracias por avisarnos, buscaremos mejorar tu experiencia.';
    }

    async function confirmarEntrega(orderId) {
        const result = await Swal.fire({
            title: `Entregar orden #${orderId}`,
            html: `
                <p class="text-sm mb-3">Agrega una valoración del servicio.</p>
                <div class="rating-stars" id="rating-stars">
                    ${[1, 2, 3, 4, 5].map(n => `<button type="button" data-rating="${n}" class="rating-star">★</button>`).join('')}
                </div>
                <p id="rating-message" class="text-sm mt-3 opacity-80">Selecciona de 1 a 5 estrellas</p>
            `,
            showCancelButton: true,
            confirmButtonText: 'Confirmar entrega',
            cancelButtonText: 'Cancelar',
            didOpen: () => {
                let rating = 0;
                const popup = Swal.getPopup();
                popup.dataset.rating = '';
                popup.querySelectorAll('.rating-star').forEach(btn => {
                    btn.addEventListener('click', () => {
                        rating = Number(btn.dataset.rating);
                        popup.dataset.rating = rating;
                        popup.querySelectorAll('.rating-star').forEach(star => {
                            star.classList.toggle('selected', Number(star.dataset.rating) <= rating);
                        });
                        popup.querySelector('#rating-message').textContent = mensajeValoracion(rating);
                    });
                });
            },
            preConfirm: () => {
                const rating = Number(Swal.getPopup().dataset.rating);
                if (!rating) {
                    Swal.showValidationMessage('Selecciona una valoración');
                    return false;
                }
                return rating;
            }
        });

        if (!result.isConfirmed) return;
        const idx = orders.findIndex(o => o.id === orderId);
        if (idx === -1) return;
        orders[idx].valoracion = {
            estrellas: result.value,
            mensaje: mensajeValoracion(result.value),
            usuario: currentUser?.usuario || 'Usuario',
            fecha: new Date().toISOString()
        };
        cambiarEstadoOrden(orderId, 'entregado', true);
        Swal.fire({
            icon: 'success',
            title: 'Entrega confirmada',
            text: orders[idx].valoracion.mensaje,
            timer: 1800,
            showConfirmButton: false
        });
    }

    function cancelarOrden(orderId) {
        Swal.fire({
            title: 'Cancelar orden',
            text: `¿Eliminar orden #${orderId}?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, cancelar'
        }).then(res => {
            if (res.isConfirmed) {
                orders = orders.filter(o => o.id !== orderId);
                saveOrders();
                renderColumns();
                updateMesaFilter();
                Swal.fire('Cancelada', '', 'success');
                showToast(`Orden #${orderId} cancelada`);
            }
        });
    }

    // Modal de orden (nueva / editar)
    function openModal(orden = null) {
        const modal = document.getElementById('orden-modal');
        document.getElementById('orden-form').reset();
        document.getElementById('edit-order-id').value = '';
        document.getElementById('modal-title').innerText = orden ? 'Editar orden' : 'Nueva orden';
        if (orden) {
            document.getElementById('edit-order-id').value = orden.id;
            document.getElementById('mesa').value = orden.mesa;
            document.getElementById('notas').value = orden.notas || '';
            document.getElementById('platos-container').innerHTML = '';
            orden.platos.forEach(p => addPlatoRow(p.nombre, p.cantidad));
        } else {
            document.getElementById('notas').value = '';
            document.getElementById('platos-container').innerHTML = '';
            addPlatoRow();
        }
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
    
    function closeModal() {
        document.getElementById('orden-modal').classList.add('hidden');
        document.getElementById('orden-modal').classList.remove('flex');
    }
    
    function addPlatoRow(nombre = '', cantidad = 1) {
        const container = document.getElementById('platos-container');
        const div = document.createElement('div');
        div.className = 'plato-item grid grid-cols-1 md:grid-cols-[1fr_120px_auto] gap-3 items-start';
        div.innerHTML = `
            <input type="text" placeholder="Nombre del plato" class="nombre-plato w-full px-4 py-2 rounded-xl border dark:bg-slate-800" value="${escapeHtml(nombre)}" required>
            <input type="number" min="1" class="cantidad-plato w-full px-4 py-2 rounded-xl border dark:bg-slate-800" value="${cantidad}" required>
            <button type="button" class="eliminar-plato w-12 h-12 rounded-xl border text-slate-400 hover:text-rose-600">
                <i class="fa-solid fa-trash"></i>
            </button>
        `;
        container.appendChild(div);
        updateDeleteButtons();
    }
    
    function updateDeleteButtons() {
        document.querySelectorAll('.eliminar-plato').forEach(btn => {
            btn.disabled = document.querySelectorAll('.plato-item').length === 1;
        });
    }
    
    function validatePlatos() {
        const items = [...document.querySelectorAll('.plato-item')];
        return items.map(item => ({
            nombre: item.querySelector('.nombre-plato').value.trim(),
            cantidad: parseInt(item.querySelector('.cantidad-plato').value)
        })).filter(p => p.nombre && p.cantidad > 0);
    }
    
    function saveOrderFromForm(e) {
        e.preventDefault();
        const idEdit = document.getElementById('edit-order-id').value;
        const mesa = parseInt(document.getElementById('mesa').value);
        const notas = document.getElementById('notas').value;
        const platos = validatePlatos();
        
        if (isNaN(mesa) || mesa < 1) {
            Swal.fire('Error', 'Mesa inválida', 'error');
            return;
        }
        if (!platos.length) {
            Swal.fire('Error', 'Agrega al menos un plato', 'error');
            return;
        }
        
        if (idEdit) {
            const idx = orders.findIndex(o => o.id == idEdit);
            if (idx !== -1) {
                orders[idx] = { ...orders[idx], mesa, platos, notas };
                saveOrders();
                Swal.fire('Orden actualizada', '', 'success');
            }
        } else {
            const newId = orders.length ? Math.max(...orders.map(o => o.id)) + 1 : 1;
            orders.unshift({
                id: newId,
                mesa,
                platos,
                notas: notas || '',
                estado: 'pendiente',
                createdAt: new Date().toISOString()
            });
            saveOrders();
            Swal.fire('Orden creada', `#${newId}`, 'success');
            showToast(`Nueva orden #${newId}`);
        }
        renderColumns();
        updateMesaFilter();
        closeModal();
    }

    // Historial
    function mostrarHistorial() {
        const modal = document.getElementById('history-modal');
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        cargarHistorial();
    }
    
    function cargarHistorial(fechaInicio = '', fechaFin = '') {
        const entregadas = orders.filter(o => o.estado === 'entregado');
        let filtradas = entregadas;
        if (fechaInicio && fechaFin) {
            const inicio = new Date(fechaInicio);
            const fin = new Date(fechaFin);
            fin.setHours(23, 59, 59);
            filtradas = entregadas.filter(o => {
                const fecha = new Date(o.createdAt);
                return fecha >= inicio && fecha <= fin;
            });
        }
        const container = document.getElementById('history-list');
        if (!filtradas.length) {
            container.innerHTML = '<div class="text-center opacity-60 p-8">No hay órdenes entregadas en este período.</div>';
            return;
        }
        container.innerHTML = filtradas.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)).map(order => `
            <div class="glass rounded-2xl p-4">
                <div class="flex justify-between items-start flex-wrap gap-2">
                    <div>
                        <span class="font-bold">Orden #${order.id}</span> - Mesa ${order.mesa}<br>
                        <span class="text-xs opacity-70">${formatDateTime(order.createdAt)}</span>
                    </div>
                    <button data-reopen="${order.id}" class="px-3 py-1 bg-blue-600 text-white rounded-xl text-sm">
                        <i class="fa-regular fa-clock"></i> Reabrir
                    </button>
                </div>
                <div class="mt-2 text-sm">${order.platos.map(p => `${p.nombre} x${p.cantidad}`).join(', ')}</div>
                ${order.notas ? `<div class="text-xs mt-1"><i class="fa-regular fa-note-sticky"></i> ${escapeHtml(order.notas)}</div>` : ''}
                ${order.valoracion ? `<div class="text-xs mt-2 rating-summary">${'★'.repeat(order.valoracion.estrellas)}${'☆'.repeat(5 - order.valoracion.estrellas)} <span>${escapeHtml(order.valoracion.mensaje)}</span></div>` : ''}
            </div>
        `).join('');
        
        document.querySelectorAll('[data-reopen]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(btn.dataset.reopen);
                const idx = orders.findIndex(o => o.id === id);
                if (idx !== -1) {
                    orders[idx].estado = 'pendiente';
                    saveOrders();
                    renderColumns();
                    Swal.fire('Orden reabierta', `La orden #${id} vuelve a Pendiente`, 'success');
                    document.getElementById('history-modal').classList.add('hidden');
                }
            });
        });
    }

    // Estadísticas con Chart.js y adaptación al modo oscuro
    function actualizarEstadisticas(force = false) {
        const modal = document.getElementById('stats-modal');
        if (!modal.classList.contains('flex') && !force) return;
        
        const isDark = document.body.classList.contains('dark');
        const textColor = isDark ? '#e4e4e7' : '#0f172a';
        const gridColor = isDark ? '#2a2a30' : '#e2e8f0';
        
        const ctxEstados = document.getElementById('estadosChart')?.getContext('2d');
        const ctxPlatos = document.getElementById('platosChart')?.getContext('2d');
        if (!ctxEstados) return;
        
        const counts = { pendiente: 0, preparacion: 0, listo: 0, entregado: 0 };
        orders.forEach(o => counts[o.estado]++);
        
        if (charts.estados) charts.estados.destroy();
        charts.estados = new Chart(ctxEstados, {
            type: 'bar',
            data: {
                labels: ['Pendiente', 'Preparación', 'Listo', 'Entregado'],
                datasets: [{
                    label: 'Cantidad',
                    data: [counts.pendiente, counts.preparacion, counts.listo, counts.entregado],
                    backgroundColor: ['#f59e0b', '#f97316', '#10b981', '#0ea5e9']
                }]
            },
            options: {
                scales: {
                    y: { ticks: { color: textColor }, grid: { color: gridColor } },
                    x: { ticks: { color: textColor }, grid: { color: gridColor } }
                },
                plugins: { legend: { labels: { color: textColor } } }
            }
        });
        
        // Top 5 platos
        const contadorPlatos = {};
        orders.forEach(o => {
            o.platos.forEach(p => {
                contadorPlatos[p.nombre] = (contadorPlatos[p.nombre] || 0) + p.cantidad;
            });
        });
        const topPlatos = Object.entries(contadorPlatos).sort((a,b) => b[1] - a[1]).slice(0,5);
        
        if (charts.platos) charts.platos.destroy();
        charts.platos = new Chart(ctxPlatos, {
            type: 'pie',
            data: {
                labels: topPlatos.map(p => p[0]),
                datasets: [{
                    data: topPlatos.map(p => p[1]),
                    backgroundColor: ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6']
                }]
            },
            options: {
                plugins: { legend: { labels: { color: textColor } } }
            }
        });
        
        // Resumen
        const totalOrdenes = orders.length;
        const platosTotales = orders.reduce((acc, o) => acc + o.platos.reduce((sum, p) => sum + p.cantidad, 0), 0);
        const promedioPlatos = (platosTotales / totalOrdenes).toFixed(1);
        const frecuenciaMesas = orders.reduce((acc, o) => { acc[o.mesa] = (acc[o.mesa] || 0) + 1; return acc; }, {});
        const mesaFrecuente = Object.entries(frecuenciaMesas).sort((a,b) => b[1] - a[1])[0]?.[0] || 'N/A';
        
        document.getElementById('stats-resumen').innerHTML = `
            <div class="glass p-3 rounded-xl"><strong>Total órdenes:</strong> ${totalOrdenes}</div>
            <div class="glass p-3 rounded-xl"><strong>Platos vendidos:</strong> ${platosTotales}</div>
            <div class="glass p-3 rounded-xl"><strong>Promedio platos/orden:</strong> ${promedioPlatos}</div>
            <div class="glass p-3 rounded-xl"><strong>Mesa más frecuente:</strong> ${mesaFrecuente}</div>
        `;
    }
    
    function abrirEstadisticas() {
        const modal = document.getElementById('stats-modal');
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        actualizarEstadisticas(true);
    }

    // Exportar / Importar
    function exportData() {
        const dataStr = JSON.stringify(orders, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pedidos_${new Date().toISOString().slice(0,19)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('Datos exportados');
    }
    
    function importData() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/json';
        input.onchange = e => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = ev => {
                try {
                    const imported = JSON.parse(ev.target.result);
                    if (Array.isArray(imported)) {
                        orders = imported;
                        saveOrders();
                        renderColumns();
                        updateMesaFilter();
                        Swal.fire('Importado', 'Datos cargados correctamente', 'success');
                    } else throw new Error();
                } catch (err) {
                    Swal.fire('Error', 'Archivo inválido', 'error');
                }
            };
            reader.readAsText(file);
        };
        input.click();
    }

    function reloadData() {
        orders = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        renderColumns();
        updateMesaFilter();
        showToast('Historial recargado');
    }

    function applyRoleUI(role) {
        const label = getRoleLabel(role);
        const userLabel = currentUser?.usuario ? `${label} - ${currentUser.usuario}` : label;
        roleBadge.innerText = userLabel;
        if (roleBadgeMobile) roleBadgeMobile.innerText = userLabel;
        document.getElementById('mesero-controls').style.display = role === 'mesero' ? 'block' : 'none';
        renderColumns();
        localStorage.setItem('lastRole', role);
    }

    // Event listeners
    function setEventListeners() {
        // Selección de rol
        document.querySelectorAll('.role-card').forEach(card => {
            card.addEventListener('click', async () => {
                const login = await loginRole(card.dataset.role);
                if (!login) return;
                currentUser = login;
                currentRole = login.role;
                document.querySelectorAll('.role-card').forEach(c => c.classList.remove('active'));
                card.classList.add('active');
                loginScreen.classList.add('hidden');
                dashboardScreen.classList.remove('hidden');
                applyRoleUI(currentRole);
                updateMesaFilter();
            });
        });
        
        // Restaurar último rol
        const lastRole = localStorage.getItem('lastRole');
        if (currentUser && lastRole && ['mesero', 'chef', 'servicio'].includes(lastRole)) {
            currentRole = lastRole;
            loginScreen.classList.add('hidden');
            dashboardScreen.classList.remove('hidden');
            document.querySelector(`.role-card[data-role="${lastRole}"]`).classList.add('active');
            applyRoleUI(currentRole);
            updateMesaFilter();
        }
        
        // Botones modales
        document.getElementById('nueva-orden-btn')?.addEventListener('click', () => openModal());
        document.getElementById('cerrar-modal')?.addEventListener('click', closeModal);
        document.getElementById('cancelar-orden')?.addEventListener('click', closeModal);
        document.getElementById('agregar-plato')?.addEventListener('click', () => addPlatoRow());
        document.getElementById('orden-form')?.addEventListener('submit', saveOrderFromForm);
        
        // Logout
        const logout = () => {
            dashboardScreen.classList.add('hidden');
            loginScreen.classList.remove('hidden');
            currentRole = '';
            currentUser = null;
            destroyDragAndDrop();
            localStorage.removeItem('lastRole');
            localStorage.removeItem('currentUser');
        };
        logoutBtn?.addEventListener('click', logout);
        logoutBtnMobile?.addEventListener('click', logout);
        
        // Recargar
        reloadBtn?.addEventListener('click', reloadData);
        reloadBtnMobile?.addEventListener('click', reloadData);
        
        // Exportar / Importar
        document.getElementById('exportBtn')?.addEventListener('click', exportData);
        document.getElementById('importBtn')?.addEventListener('click', importData);
        document.getElementById('exportBtnMobile')?.addEventListener('click', exportData);
        document.getElementById('importBtnMobile')?.addEventListener('click', importData);
        
        // Historial y estadísticas
        historyBtn?.addEventListener('click', mostrarHistorial);
        historyBtnMobile?.addEventListener('click', mostrarHistorial);
        statsBtn?.addEventListener('click', abrirEstadisticas);
        statsBtnMobile?.addEventListener('click', abrirEstadisticas);
        document.getElementById('close-history')?.addEventListener('click', () => document.getElementById('history-modal').classList.add('hidden'));
        document.getElementById('close-stats')?.addEventListener('click', () => document.getElementById('stats-modal').classList.add('hidden'));
        document.getElementById('history-filtrar')?.addEventListener('click', () => {
            const inicio = document.getElementById('history-fecha-inicio').value;
            const fin = document.getElementById('history-fecha-fin').value;
            cargarHistorial(inicio, fin);
        });
        
        // Sincronización búsqueda y filtro
        const syncSearch = (src, dst) => { if (src && dst) src.addEventListener('input', () => { dst.value = src.value; renderColumns(); }); };
        syncSearch(searchInput, searchInputMobile);
        syncSearch(searchInputMobile, searchInput);
        const syncMesa = (src, dst) => { if (src && dst) src.addEventListener('change', () => { dst.value = src.value; renderColumns(); }); };
        syncMesa(mesaFilter, mesaFilterMobile);
        syncMesa(mesaFilterMobile, mesaFilter);
        
        // Modo oscuro (con actualización de gráficos)
        const toggleDark = () => {
            const isDark = document.body.classList.toggle('dark');
            document.documentElement.classList.toggle('dark', isDark);
            localStorage.setItem('darkMode', isDark);
            if (document.getElementById('stats-modal').classList.contains('flex')) {
                actualizarEstadisticas(true);
            }
        };
        darkToggle?.addEventListener('click', toggleDark);
        darkToggleMobile?.addEventListener('click', toggleDark);
        if (localStorage.getItem('darkMode') === 'true') {
            document.body.classList.add('dark');
            document.documentElement.classList.add('dark');
        }
        
        // Acciones de botones en tarjetas (cancelar, preparar, listo, entregar, editar)
        document.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-action][data-order-id]');
            if (!btn) return;
            const id = parseInt(btn.dataset.orderId);
            const action = btn.dataset.action;
            if (action === 'cancelar') cancelarOrden(id);
            if (action === 'preparar') cambiarEstadoOrden(id, 'preparacion');
            if (action === 'listo') cambiarEstadoOrden(id, 'listo');
            if (action === 'entregar') confirmarEntrega(id);
            if (action === 'editar') {
                const orden = orders.find(o => o.id === id);
                if (orden) openModal(orden);
            }
        });
        
        // Menú móvil
        document.getElementById('mobile-menu-button')?.addEventListener('click', () => {
            document.getElementById('mobile-menu').classList.toggle('hidden');
        });
    }

    // Datos de ejemplo
    function loadSampleData() {
        if (orders.length) return;
        const now = Date.now();
        orders = [
            { id: 1, mesa: 3, platos: [{nombre:'Hamburguesa', cantidad:2},{nombre:'Papas', cantidad:1}], notas: '', estado: 'pendiente', createdAt: new Date(now-34*60000).toISOString() },
            { id: 2, mesa: 5, platos: [{nombre:'Pizza', cantidad:1},{nombre:'Ensalada', cantidad:1}], notas: 'Sin cebolla', estado: 'preparacion', createdAt: new Date(now-26*60000).toISOString() },
            { id: 3, mesa: 2, platos: [{nombre:'Pasta', cantidad:1}], notas: '', estado: 'listo', createdAt: new Date(now-17*60000).toISOString() },
            { id: 4, mesa: 1, platos: [{nombre:'Sopa', cantidad:1}], notas: '', estado: 'entregado', createdAt: new Date(now-9*60000).toISOString() },
            { id: 5, mesa: 4, platos: [{nombre:'Tacos', cantidad:3},{nombre:'Guacamole', cantidad:1}], notas: 'Picante', estado: 'pendiente', createdAt: new Date(now-5*60000).toISOString() },
            { id: 6, mesa: 6, platos: [{nombre:'Ceviche', cantidad:2}], notas: '', estado: 'preparacion', createdAt: new Date(now-45*60000).toISOString() },
            { id: 7, mesa: 2, platos: [{nombre:'Lomo saltado', cantidad:1}], notas: 'Punto termino tres', estado: 'listo', createdAt: new Date(now-20*60000).toISOString() },
            { id: 8, mesa: 7, platos: [{nombre:'Flan', cantidad:2},{nombre:'Café', cantidad:2}], notas: '', estado: 'entregado', createdAt: new Date(now-70*60000).toISOString() }
        ];
        saveOrders();
    }

    // Inicialización
    loadSampleData();
    setEventListeners();
    addPlatoRow(); // fila por defecto en el modal
    updateDeleteButtons();
})();
