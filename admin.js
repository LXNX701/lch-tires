// ============================================================
// MISMO SUPABASE_KEY que en script.js — reemplaza con tu key real
// ============================================================
const SUPABASE_URL = 'https://uiqbuhhexmkruljepmim.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpcWJ1aGhleG1rcnVsamVwbWltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5NjY2NTQsImV4cCI6MjA5NDU0MjY1NH0.wAb-e8Fc98zeGQtfj5MuBMYP3CSmXWf5b3xg3R7UpNU'; // ← CAMBIA ESTO
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Oculta el layout mientras verifica sesión (evita flash de contenido)
document.querySelector('.main-layout')?.style.setProperty('display', 'none');

async function checkUser() {
    const { data } = await _supabase.auth.getSession();
    if (!data?.session) {
        window.location.href = 'index.html';
        return false;
    }
    // Muestra el contenido sólo si hay sesión válida
    document.querySelector('.main-layout')?.style.setProperty('display', 'flex');
    return true;
}

// ── Agregar producto ─────────────────────────────────────────
const form = document.getElementById('product-form');
if (form) {
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const size      = document.getElementById('size').value.trim();
        const brand     = document.getElementById('brand').value.trim();
        const condition = document.getElementById('condition').value;
        const stock     = parseInt(document.getElementById('stock').value, 10);
        const price     = parseFloat(document.getElementById('price').value);

        if (!size || !brand || Number.isNaN(stock) || Number.isNaN(price) || stock < 0 || price < 0) {
            alert('Por favor completa todos los campos correctamente.');
            return;
        }

        const btn = form.querySelector('.btn-save');
        btn.disabled = true;
        btn.textContent = 'Guardando…';

        const { error } = await _supabase
            .from('inventario')
            .insert([{ size, brand, condition, stock, price }]);

        btn.disabled = false;
        btn.textContent = 'Guardar Producto';

        if (error) {
            alert('Error al guardar: ' + error.message);
        } else {
            alert('✅ Producto agregado con éxito.');
            form.reset();
            await fetchInventory();
        }
    });
}

// ── Cargar inventario ────────────────────────────────────────
async function fetchInventory() {
    const body = document.getElementById('admin-inventory-body');
    if (!body) return;

    body.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-gray);padding:20px">Cargando…</td></tr>';

    const { data, error } = await _supabase
        .from('inventario')
        .select('*')
        .order('id', { ascending: true });

    body.innerHTML = '';

    if (error) {
        body.innerHTML = `<tr><td colspan="5" style="color:#e74c3c;padding:15px">Error: ${error.message}</td></tr>`;
        return;
    }

    if (!data || data.length === 0) {
        body.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-gray);padding:20px">No hay productos en inventario</td></tr>';
        return;
    }

    data.forEach(item => {
        const conditionLabel = item.condition === 'New' ? 'Nueva' : 'Usada';
        body.innerHTML += `
            <tr>
                <td>${item.size}</td>
                <td>${item.brand}</td>
                <td><span class="${item.condition === 'New' ? 'badge-new' : 'badge-used'}">${conditionLabel}</span></td>
                <td style="color:var(--accent)">${item.stock}</td>
                <td>$${Number(item.price).toFixed(2)}</td>
                <td>
                    <button class="btn-delete" onclick="deleteItem(${item.id})">Eliminar</button>
                </td>
            </tr>
        `;
    });
}

// ── Eliminar producto ────────────────────────────────────────
window.deleteItem = async (id) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta llanta?')) return;

    const { error } = await _supabase.from('inventario').delete().eq('id', id);

    if (error) {
        alert('Error al eliminar: ' + error.message);
    } else {
        await fetchInventory();
    }
};

// ── Logout ───────────────────────────────────────────────────
window.logout = async () => {
    await _supabase.auth.signOut();
    window.location.href = 'index.html';
};

// ── Init ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    const ok = await checkUser();
    if (ok) await fetchInventory();
});
