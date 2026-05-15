(function(){
    const STORAGE_KEY = 'restaurantOrders';
    const STATE_ORDER = ['pendiente', 'preparacion', 'listo', 'entregado'];
    let currentRole = '';
    let orders = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    let drake = null;

    // Elementos (todos los originales + nuevos)
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
    const columns = {
        pendiente: document.getElementById('pendiente-column'),
        preparacion: document.getElementById('preparacion-column'),
        listo: document.getElementById('listo-column'),
        entregado: document.getElementById('entregado-column')
    };
    const badges = {};
    const totals = {};
    STATE_ORDER.forEach(s => { badges[s] = document.getElementById(`badge-${s}`); totals[s] = document.getElementById(`count-${s}`); });

    // Funciones auxiliares (originales + mejoras)
    function saveOrders(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(orders)); }
    function showToast(msg){ const nt = document.getElementById('notification-text'); if(nt) nt.textContent = msg; const toast = document.getElementById('notification'); toast.classList.add('show'); setTimeout(()=>toast.classList.remove('show'),2500); }
    function playSound(){ try{ document.getElementById('notification-sound').play(); }catch(e){} }
    function getTimeAgo(isoDate){ const diff = (Date.now() - new Date(isoDate)) / 1000 / 60; if(diff < 1) return 'recién ahora'; if(diff < 60) return `hace ${Math.floor(diff)} min`; return `hace ${Math.floor(diff/60)} h`; }
    function formatDateTime(iso){ return new Date(iso).toLocaleString('es-ES', { hour:'2-digit', minute:'2-digit', day:'2-digit', month:'short' }); }
    function visibleStates(){ return currentRole === 'chef' ? ['pendiente','preparacion','listo'] : (currentRole === 'servicio' ? ['listo','entregado'] : STATE_ORDER); }
    function cardAllowsAction(order){ if(currentRole==='mesero') return order.estado==='pendiente'; if(currentRole==='chef') return ['pendiente','preparacion'].includes(order.estado); if(currentRole==='servicio') return order.estado==='listo'; return false; }
    function matchesSearch(order, query){ if(!query) return true; const haystack = `${order.id} mesa ${order.mesa} ${order.platos.map(p=>p.nombre).join(' ')} ${order.notas||''}`.toLowerCase(); return haystack.includes(query); }
    function filteredOrders(){ const q = (searchInput.value || searchInputMobile.value || '').trim().toLowerCase(); const mesa = mesaFilter.value || mesaFilterMobile.value || ''; return orders.filter(o => matchesSearch(o,q) && (mesa === '' || o.mesa == mesa)); }

    function updateMesaFilter(){
        const mesas = [...new Set(orders.map(o=>o.mesa))].sort((a,b)=>a-b);
        const options = '<option value="">Todas las mesas</option>' + mesas.map(m=>`<option value="${m}">Mesa ${m}</option>`).join('');
        mesaFilter.innerHTML = options;
        mesaFilterMobile.innerHTML = options;
    }

    // Renderizado de tarjeta (con botón Editar si corresponde)
    function escapeHtml(str){ if(!str) return ''; return str.replace(/[&<>]/g, function(m){ if(m === '&') return '&amp;'; if(m === '<') return '&lt;'; if(m === '>') return '&gt;'; return m;}); }
    function renderOrderCard(order){
        const meta = { pendiente:{label:'Pendiente',dot:'bg-amber-500',cls:'bg-amber-100 text-amber-800'}, preparacion:{label:'En preparación',dot:'bg-orange-500',cls:'bg-orange-100 text-orange-800'}, listo:{label:'Listo',dot:'bg-emerald-500',cls:'bg-emerald-100 text-emerald-800'}, entregado:{label:'Entregado',dot:'bg-sky-500',cls:'bg-sky-100 text-sky-800'} }[order.estado];
        const canDrag = cardAllowsAction(order);
        const isEditable = (currentRole === 'mesero' && order.estado === 'pendiente');
        const dishes = order.platos.map(p=>`<li class="flex justify-between"><span>${escapeHtml(p.nombre)}</span><span class="font-medium">x${p.cantidad}</span></li>`).join('');
        return `
            <article class="order-card bg-white dark:bg-slate-800 rounded-2xl border p-4 shadow-sm ${canDrag ? 'cursor-grab' : ''}" data-order-id="${order.id}">
                <div class="flex justify-between items-start">
                    <div><div class="font-bold">Orden #${order.id} - Mesa ${order.mesa}</div><div class="text-xs opacity-70 mt-1"><i class="fa-regular fa-clock"></i> ${formatDateTime(order.createdAt)} <span class="time-badge">${getTimeAgo(order.createdAt)}</span></div></div>
                    <span class="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full border ${meta.cls}"><span class="status-dot ${meta.dot}"></span>${meta.label}</span>
                </div>
                ${order.notas ? `<div class="mt-2 text-xs bg-yellow-50 dark:bg-yellow-900/30 p-1 rounded"><i class="fa-regular fa-note-sticky"></i> ${escapeHtml(order.notas)}</div>` : ''}
                <div class="my-2 border-t"></div>
                <ul class="text-sm space-y-1">${dishes}</ul>
                <div class="mt-3 flex gap-2 flex-wrap">
                    ${isEditable ? `<button data-action="editar" data-order-id="${order.id}" class="text-xs bg-indigo-100 dark:bg-indigo-900 px-3 py-1 rounded-full"><i class="fa-regular fa-pen-to-square"></i> Editar</button>` : ''}
                    ${currentRole === 'mesero' && order.estado === 'pendiente' ? `<button data-action="cancelar" data-order-id="${order.id}" class="text-xs bg-rose-100 dark:bg-rose-900 px-3 py-1 rounded-full"><i class="fa-regular fa-trash-can"></i> Cancelar</button>` : ''}
                    ${currentRole === 'chef' && order.estado === 'pendiente' ? `<button data-action="preparar" data-order-id="${order.id}" class="text-xs bg-orange-500 text-white px-3 py-1 rounded-full">Comenzar</button>` : ''}
                    ${currentRole === 'chef' && order.estado === 'preparacion' ? `<button data-action="listo" data-order-id="${order.id}" class="text-xs bg-emerald-500 text-white px-3 py-1 rounded-full">Marcar listo</button>` : ''}
                    ${currentRole === 'servicio' && order.estado === 'listo' ? `<button data-action="entregar" data-order-id="${order.id}" class="text-xs bg-sky-500 text-white px-3 py-1 rounded-full">Entregar</button>` : ''}
                </div>
            </article>`;
    }

    function renderColumns(){
        const list = filteredOrders();
        for(let st of STATE_ORDER){
            let count = list.filter(o=>o.estado===st).length;
            if(totals[st]) totals[st].innerText = count;
            if(badges[st]) badges[st].innerText = count;
        }
        const visible = visibleStates();
        for(let st of STATE_ORDER){
            const filtered = list.filter(o=>o.estado===st && visible.includes(st));
            const html = filtered.length ? filtered.map(renderOrderCard).join('') : `<div class="p-6 text-center opacity-60 border border-dashed rounded-2xl"><i class="fa-regular fa-rectangle-list"></i> Sin órdenes</div>`;
            columns[st].innerHTML = html;
        }
        if(currentRole === 'chef') initDragAndDrop(); else destroyDragAndDrop();
    }

    // Drag & drop (exactamente como en el original)
    function destroyDragAndDrop(){ if(drake){ drake.destroy(); drake = null; } }
    function initDragAndDrop(){
        destroyDragAndDrop();
        drake = dragula([columns.pendiente, columns.preparacion, columns.listo], {
            moves: (el) => el.classList.contains('order-card'),
            accepts: (el, target) => target !== columns.entregado
        });
        drake.on('drop', (el, target) => {
            let orderId = Number(el.dataset.orderId);
            let newState = null;
            if(target === columns.pendiente) newState = 'pendiente';
            else if(target === columns.preparacion) newState = 'preparacion';
            else if(target === columns.listo) newState = 'listo';
            if(newState) cambiarEstadoOrden(orderId, newState, true);
        });
    }

    function cambiarEstadoOrden(orderId, nuevoEstado, silent=false){
        const idx = orders.findIndex(o=>o.id === orderId);
        if(idx === -1) return;
        const old = orders[idx].estado;
        orders[idx].estado = nuevoEstado;
        saveOrders();
        if(nuevoEstado === 'listo' && old !== 'listo') playSound();
        renderColumns();
        if(!silent) Swal.fire({icon:'success',title:'Estado actualizado',text:`Orden #${orderId} → ${nuevoEstado}`,timer:1500,showConfirmButton:false});
        else showToast(`Orden #${orderId} movida a ${nuevoEstado}`);
    }

    function cancelarOrden(orderId){
        Swal.fire({title:'Cancelar orden',text:`¿Eliminar orden #${orderId}?`,icon:'warning',showCancelButton:true,confirmButtonText:'Sí, cancelar'}).then(res=>{
            if(res.isConfirmed){ orders = orders.filter(o=>o.id !== orderId); saveOrders(); renderColumns(); updateMesaFilter(); Swal.fire('Cancelada','','success'); showToast(`Orden #${orderId} cancelada`); }
        });
    }

    // Modal de orden (nueva y edición)
    function openModal(orden=null){
        const modal = document.getElementById('orden-modal');
        document.getElementById('orden-form').reset();
        document.getElementById('edit-order-id').value = '';
        document.getElementById('modal-title').innerText = orden ? 'Editar orden' : 'Nueva orden';
        if(orden){
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
        modal.classList.remove('hidden'); modal.classList.add('flex');
    }
    function closeModal(){ document.getElementById('orden-modal').classList.add('hidden'); document.getElementById('orden-modal').classList.remove('flex'); }
    function addPlatoRow(nombre='', cantidad=1){
        const container = document.getElementById('platos-container');
        const div = document.createElement('div');
        div.className = 'plato-item grid grid-cols-1 md:grid-cols-[1fr_120px_auto] gap-3 items-start';
        div.innerHTML = `<input type="text" placeholder="Nombre del plato" class="nombre-plato w-full px-4 py-2 rounded-xl border dark:bg-slate-800" value="${escapeHtml(nombre)}" required><input type="number" min="1" class="cantidad-plato w-full px-4 py-2 rounded-xl border dark:bg-slate-800" value="${cantidad}" required><button type="button" class="eliminar-plato w-12 h-12 rounded-xl border text-slate-400 hover:text-rose-600"><i class="fa-solid fa-trash"></i></button>`;
        container.appendChild(div);
        updateDeleteButtons();
    }
    function updateDeleteButtons(){ document.querySelectorAll('.eliminar-plato').forEach(btn=>{ btn.disabled = document.querySelectorAll('.plato-item').length === 1; }); }
    function validatePlatos(){ const items = [...document.querySelectorAll('.plato-item')]; return items.map(item=>({nombre:item.querySelector('.nombre-plato').value.trim(), cantidad:parseInt(item.querySelector('.cantidad-plato').value)})).filter(p=>p.nombre && p.cantidad>0); }
    function saveOrderFromForm(e){
        e.preventDefault();
        const idEdit = document.getElementById('edit-order-id').value;
        const mesa = parseInt(document.getElementById('mesa').value);
        const notas = document.getElementById('notas').value;
        const platos = validatePlatos();
        if(isNaN(mesa) || mesa<1){ Swal.fire('Error','Mesa inválida','error'); return; }
        if(!platos.length){ Swal.fire('Error','Agrega al menos un plato','error'); return; }
        if(idEdit){
            const idx = orders.findIndex(o=>o.id == idEdit);
            if(idx !== -1){
                orders[idx] = {...orders[idx], mesa, platos, notas};
                saveOrders();
                Swal.fire('Orden actualizada','','success');
            }
        } else {
            const newId = orders.length ? Math.max(...orders.map(o=>o.id)) + 1 : 1;
            orders.unshift({ id:newId, mesa, platos, notas:notas || '', estado:'pendiente', createdAt:new Date().toISOString() });
            saveOrders();
            Swal.fire('Orden creada',`#${newId}`,'success');
            showToast(`Nueva orden #${newId}`);
        }
        renderColumns();
        updateMesaFilter();
        closeModal();
    }

    // Exportar/Importar
    function exportData(){
        const dataStr = JSON.stringify(orders, null, 2);
        const blob = new Blob([dataStr], {type:'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `pedidos_${new Date().toISOString().slice(0,19)}.json`;
        a.click(); URL.revokeObjectURL(url);
        showToast('Datos exportados');
    }
    function importData(){
        const input = document.createElement('input');
        input.type = 'file'; input.accept = 'application/json';
        input.onchange = e => {
            const file = e.target.files[0];
            if(!file) return;
            const reader = new FileReader();
            reader.onload = ev => {
                try{
                    const imported = JSON.parse(ev.target.result);
                    if(Array.isArray(imported)){ orders = imported; saveOrders(); renderColumns(); updateMesaFilter(); Swal.fire('Importado','Datos cargados correctamente','success'); }
                    else throw new Error();
                }catch(err){ Swal.fire('Error','Archivo inválido','error'); }
            };
            reader.readAsText(file);
        };
        input.click();
    }

    function reloadData(){
        orders = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        renderColumns();
        updateMesaFilter();
        showToast('Historial recargado');
    }

    function applyRoleUI(role){
        const label = {mesero:'Mesero', chef:'Chef', servicio:'Servicio'}[role];
        roleBadge.innerText = label;
        if(roleBadgeMobile) roleBadgeMobile.innerText = label;
        document.getElementById('mesero-controls').style.display = role === 'mesero' ? 'block' : 'none';
        renderColumns();
    }

    // Event listeners (conserva todos los originales y añade los nuevos)
    function setEventListeners(){
        document.querySelectorAll('.role-card').forEach(card=>{
            card.addEventListener('click',()=>{
                currentRole = card.dataset.role;
                document.querySelectorAll('.role-card').forEach(c=>c.classList.remove('active'));
                card.classList.add('active');
                loginScreen.classList.add('hidden');
                dashboardScreen.classList.remove('hidden');
                applyRoleUI(currentRole);
                updateMesaFilter();
            });
        });
        document.getElementById('nueva-orden-btn')?.addEventListener('click',()=>openModal());
        document.getElementById('cerrar-modal')?.addEventListener('click',closeModal);
        document.getElementById('cancelar-orden')?.addEventListener('click',closeModal);
        document.getElementById('agregar-plato')?.addEventListener('click',()=>addPlatoRow());
        document.getElementById('orden-form')?.addEventListener('submit',saveOrderFromForm);
        const logout = ()=>{ dashboardScreen.classList.add('hidden'); loginScreen.classList.remove('hidden'); currentRole=''; destroyDragAndDrop(); };
        logoutBtn?.addEventListener('click',logout);
        logoutBtnMobile?.addEventListener('click',logout);
        reloadBtn?.addEventListener('click',reloadData);
        reloadBtnMobile?.addEventListener('click',reloadData);
        document.getElementById('exportBtn')?.addEventListener('click',exportData);
        document.getElementById('importBtn')?.addEventListener('click',importData);
        document.getElementById('exportBtnMobile')?.addEventListener('click',exportData);
        document.getElementById('importBtnMobile')?.addEventListener('click',importData);
        // Sincronización de búsqueda (original)
        const syncSearch = (src, dst) => { if(src && dst) src.addEventListener('input',()=>{ dst.value = src.value; renderColumns(); }); };
        syncSearch(searchInput, searchInputMobile);
        syncSearch(searchInputMobile, searchInput);
        // Sincronización de filtro por mesa
        const syncMesa = (src, dst) => { if(src && dst) src.addEventListener('change',()=>{ dst.value = src.value; renderColumns(); }); };
        syncMesa(mesaFilter, mesaFilterMobile);
        syncMesa(mesaFilterMobile, mesaFilter);
        // Modo oscuro
        const toggleDark = ()=>{ document.body.classList.toggle('dark'); localStorage.setItem('darkMode', document.body.classList.contains('dark')); };
        darkToggle?.addEventListener('click',toggleDark);
        darkToggleMobile?.addEventListener('click',toggleDark);
        if(localStorage.getItem('darkMode') === 'true') document.body.classList.add('dark');
        // Eventos de acciones (incluye "editar")
        document.addEventListener('click',(e)=>{
            const btn = e.target.closest('[data-action][data-order-id]');
            if(!btn) return;
            const id = parseInt(btn.dataset.orderId);
            const action = btn.dataset.action;
            if(action === 'cancelar') cancelarOrden(id);
            if(action === 'preparar') cambiarEstadoOrden(id,'preparacion');
            if(action === 'listo') cambiarEstadoOrden(id,'listo');
            if(action === 'entregar') cambiarEstadoOrden(id,'entregado');
            if(action === 'editar'){ const orden = orders.find(o=>o.id === id); if(orden) openModal(orden); }
        });
        // Menú móvil (original)
        document.getElementById('mobile-menu-button')?.addEventListener('click',()=>{ document.getElementById('mobile-menu').classList.toggle('hidden'); });
    }

    function loadSampleData(){
        if(orders.length) return;
        const now = Date.now();
        orders = [
            { id:1, mesa:3, platos:[{nombre:'Hamburguesa', cantidad:2},{nombre:'Papas', cantidad:1}], notas:'', estado:'pendiente', createdAt:new Date(now-34*60000).toISOString() },
            { id:2, mesa:5, platos:[{nombre:'Pizza', cantidad:1},{nombre:'Ensalada', cantidad:1}], notas:'Sin cebolla', estado:'preparacion', createdAt:new Date(now-26*60000).toISOString() },
            { id:3, mesa:2, platos:[{nombre:'Pasta', cantidad:1}], notas:'', estado:'listo', createdAt:new Date(now-17*60000).toISOString() },
            { id:4, mesa:1, platos:[{nombre:'Sopa', cantidad:1}], notas:'', estado:'entregado', createdAt:new Date(now-9*60000).toISOString() }
        ];
        saveOrders();
    }

    loadSampleData();
    setEventListeners();
    addPlatoRow(); // fila por defecto en el modal
    updateDeleteButtons();
    // Inicializar UI (dashboard oculto)
})();