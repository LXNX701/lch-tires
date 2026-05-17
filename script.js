// ============================================================
// REEMPLAZA ESTOS VALORES CON LOS DE TU PROYECTO EN SUPABASE
// Project Settings → API → anon public key (empieza con eyJ...)
// ============================================================
const SUPABASE_URL = 'https://uiqbuhhexmkruljepmim.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpcWJ1aGhleG1rcnVsamVwbWltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5NjY2NTQsImV4cCI6MjA5NDU0MjY1NH0.wAb-e8Fc98zeGQtfj5MuBMYP3CSmXWf5b3xg3R7UpNU'; // ← CAMBIA ESTO
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let inventario = [];
let cart = [];

async function fetchInventory() {
    const { data, error } = await _supabase
        .from('inventario')
        .select('*')
        .order('id', { ascending: true });

    if (!error && data) {
        inventario = data;
        render();
    } else if (error) {
        console.error('Error cargando inventario:', error.message);
    }
}

function render(list = inventario) {
    const body = document.getElementById('inventory-body');
    if (!body) return;
    body.innerHTML = '';

    if (list.length === 0) {
        body.innerHTML = '<tr><td colspan="6" style="text-align:center; color:var(--text-gray); padding:30px">No hay resultados</td></tr>';
        return;
    }

    list.forEach(item => {
        const conditionClass = item.condition === 'New' ? 'badge-new' : 'badge-used';
        const conditionLabel = item.condition === 'New' ? 'Nueva' : 'Usada';
        body.innerHTML += `
            <tr>
                <td>${item.size}</td>
                <td>${item.brand}</td>
                <td><span class="${conditionClass}">${conditionLabel}</span></td>
                <td style="color:var(--accent)">${item.stock}</td>
                <td>$${Number(item.price).toFixed(2)}</td>
                <td>
                    <button
                        class="btn-select"
                        onclick="addToCart(${item.id})"
                        ${item.stock === 0 ? 'disabled style="opacity:0.4;cursor:not-allowed"' : ''}
                    >
                        ${item.stock === 0 ? 'Sin stock' : 'Agregar'}
                    </button>
                </td>
            </tr>
        `;
    });
}

function filterInventory() {
    const query = document.getElementById('search')?.value.trim().toLowerCase();
    if (!query) {
        render();
        return;
    }
    const filtered = inventario.filter(item =>
        item.size.toLowerCase().includes(query) ||
        item.brand.toLowerCase().includes(query)
    );
    render(filtered);
}

window.addToCart = function(id) {
    const item = inventario.find(p => p.id === id);
    if (!item) return;

    const cartItem = cart.find(p => p.id === id);
    const currentQty = cartItem ? cartItem.quantity : 0;

    if (currentQty >= item.stock) {
        alert('No hay más unidades disponibles de este producto.');
        return;
    }

    if (cartItem) {
        cartItem.quantity += 1;
    } else {
        cart.push({ ...item, quantity: 1 });
    }

    renderCart();
};

window.removeFromCart = function(id) {
    cart = cart.filter(item => item.id !== id);
    renderCart();
};

function renderCart() {
    const cartDiv = document.getElementById('cart-items');
    const totalDiv = document.getElementById('cart-total');
    if (!cartDiv || !totalDiv) return;

    cartDiv.innerHTML = '';
    let total = 0;

    if (cart.length === 0) {
        cartDiv.innerHTML = '<p class="empty-msg">No tires selected yet</p>';
        totalDiv.innerText = '$0.00';
        return;
    }

    cart.forEach(item => {
        total += item.price * item.quantity;
        cartDiv.innerHTML += `
            <div class="cart-item">
                <div>
                    <strong>${item.quantity}x</strong> ${item.size} — ${item.brand}
                    <div class="cart-item-price">$${(item.price * item.quantity).toFixed(2)}</div>
                </div>
                <button class="btn-remove" onclick="removeFromCart(${item.id})">✕</button>
            </div>
        `;
    });

    totalDiv.innerText = `$${total.toFixed(2)}`;
}

window.finalizarVenta = async function() {
    if (cart.length === 0) {
        alert('El carrito está vacío.');
        return;
    }

    // Verificar stock antes de procesar
    for (const cartItem of cart) {
        const item = inventario.find(p => p.id === cartItem.id);
        if (!item) continue;
        if (cartItem.quantity > item.stock) {
            alert(`Stock insuficiente para: ${item.size} ${item.brand}.\nDisponible: ${item.stock}`);
            return;
        }
    }

    // Actualizar stock en Supabase
    for (const cartItem of cart) {
        const item = inventario.find(p => p.id === cartItem.id);
        if (!item) continue;

        const newStock = item.stock - cartItem.quantity;
        const { error } = await _supabase
            .from('inventario')
            .update({ stock: newStock })
            .eq('id', item.id);

        if (error) {
            alert('Error al actualizar stock: ' + error.message);
            return;
        }
    }

    cart = [];
    alert('✅ Venta finalizada con éxito.');
    await fetchInventory(); // Recarga inventario con stocks actualizados
    renderCart();
};

// ── Login Modal ──────────────────────────────────────────────
window.mostrarLogin = () => {
    document.getElementById('login-modal').style.display = 'flex';
};

window.cerrarLogin = () => {
    document.getElementById('login-modal').style.display = 'none';
    document.getElementById('login-email').value = '';
    document.getElementById('login-pass').value = '';
};

window.login = async () => {
    const email = document.getElementById('login-email').value.trim();
    const pass  = document.getElementById('login-pass').value;

    if (!email || !pass) {
        alert('Ingresa email y contraseña.');
        return;
    }

    const { data, error } = await _supabase.auth.signInWithPassword({ email, password: pass });

    if (error) {
        alert('Error: ' + error.message);
    } else if (data?.session) {
        window.location.href = 'admin.html';
    } else {
        alert('No se pudo iniciar sesión.');
    }
};

// Cierra el modal al hacer click fuera
document.addEventListener('DOMContentLoaded', () => {
    fetchInventory();
    document.getElementById('search')?.addEventListener('input', filterInventory);

    // Cerrar modal al click fuera
    const modal = document.getElementById('login-modal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) cerrarLogin();
        });
    }
});
