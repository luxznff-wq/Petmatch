import { env } from '../config/env.js';

/**
 * Conjunto de datos de demostración compartido por el seed de PostgreSQL y
 * por el arranque en modo memoria, para que ambos muestren exactamente lo
 * mismo. Las fotografías son enlaces públicos de Unsplash.
 */

export const adminUser = {
  firstName: 'Ada',
  lastName: 'Administradora',
  email: env.seed.adminEmail,
  password: env.seed.adminPassword,
  phone: '+51 999 000 001',
  city: 'Lima',
  role: 'ADMINISTRADOR'
};

export const shelterOwners = [
  {
    key: 'esperanza',
    user: {
      firstName: 'Rosa',
      lastName: 'Flores',
      email: 'refugio.esperanza@petmatch.com',
      password: env.seed.demoPassword,
      phone: '+51 999 111 222',
      city: 'Arequipa',
      role: 'REFUGIO'
    },
    shelter: {
      name: 'Refugio Esperanza',
      description:
        'Rescatamos, rehabilitamos y buscamos hogar para animales abandonados en Arequipa desde 2014.',
      address: 'Av. Ejército 512, Yanahuara',
      city: 'Arequipa',
      region: 'Arequipa',
      phone: '+51 999 111 222',
      email: 'contacto@refugioesperanza.pe',
      website: 'https://refugioesperanza.pe',
      social: { facebook: 'https://facebook.com/refugioesperanza' },
      hours: 'Lunes a sábado de 9:00 a 18:00',
      status: 'VERIFICADO'
    }
  },
  {
    key: 'huellitas',
    user: {
      firstName: 'Carlos',
      lastName: 'Mendoza',
      email: 'huellitas@petmatch.com',
      password: env.seed.demoPassword,
      phone: '+51 999 333 444',
      city: 'Lima',
      role: 'REFUGIO'
    },
    shelter: {
      name: 'Huellitas Perú',
      description:
        'Albergue comunitario en Lima. Priorizamos adopciones responsables y seguimiento post-adopción.',
      address: 'Jr. Los Cedros 220, Surquillo',
      city: 'Lima',
      region: 'Lima',
      phone: '+51 999 333 444',
      email: 'hola@huellitas.pe',
      website: 'https://huellitas.pe',
      social: { instagram: 'https://instagram.com/huellitasperu' },
      hours: 'Todos los días de 10:00 a 17:00',
      status: 'VERIFICADO'
    }
  },
  {
    key: 'patitas',
    user: {
      firstName: 'Lucía',
      lastName: 'Quispe',
      email: 'patitas@petmatch.com',
      password: env.seed.demoPassword,
      phone: '+51 999 555 666',
      city: 'Cusco',
      role: 'REFUGIO'
    },
    shelter: {
      name: 'Patitas del Sol',
      description: 'Refugio cusqueño enfocado en perros de gran tamaño y casos de rehabilitación.',
      address: 'Calle Sol 145, San Blas',
      city: 'Cusco',
      region: 'Cusco',
      phone: '+51 999 555 666',
      email: 'adopciones@patitasdelsol.pe',
      social: {},
      hours: 'Martes a domingo de 9:00 a 16:00',
      // Queda PENDIENTE a propósito: sirve para demostrar la verificación (§41).
      status: 'PENDIENTE'
    }
  }
];

export const adopters = [
  {
    firstName: 'Juan',
    lastName: 'Pérez',
    email: 'juan.perez@petmatch.com',
    password: env.seed.demoPassword,
    phone: '+51 988 777 666',
    address: 'Av. Primavera 145, Dpto. 302',
    city: 'Lima',
    role: 'ADOPTANTE'
  },
  {
    firstName: 'María',
    lastName: 'Torres',
    email: 'maria.torres@petmatch.com',
    password: env.seed.demoPassword,
    phone: '+51 977 666 555',
    address: 'Calle Mercaderes 88',
    city: 'Arequipa',
    role: 'ADOPTANTE'
  }
];

const photo = (id) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=900&q=80`;

export const pets = [
  {
    shelterKey: 'esperanza',
    name: 'Luna',
    species: 'Gato',
    breed: 'Mestiza',
    sex: 'Hembra',
    size: 'Pequeño',
    birthDate: '2024-03-12',
    color: 'Gris atigrado',
    weightKg: 3.4,
    city: 'Arequipa',
    region: 'Arequipa',
    description: 'Gata tranquila y cariñosa que disfruta de las siestas al sol.',
    story: 'Llegó al refugio con tres meses tras ser rescatada de una obra en construcción.',
    image: photo('photo-1573865526739-10659fec78a5'),
    attributes: { vaccinated: true, sterilized: true, dewormed: true, sociable: true, goodWithCats: true },
    status: 'DISPONIBLE'
  },
  {
    shelterKey: 'huellitas',
    name: 'Max',
    species: 'Perro',
    breed: 'Labrador',
    sex: 'Macho',
    size: 'Grande',
    birthDate: '2023-01-20',
    color: 'Dorado',
    weightKg: 28,
    city: 'Lima',
    region: 'Lima',
    description: 'Perro enérgico, ideal para una familia con espacio y ganas de pasear.',
    story: 'Su familia anterior se mudó al extranjero y no pudo llevarlo.',
    image: photo('photo-1552053831-71594a27632d'),
    attributes: {
      vaccinated: true,
      sterilized: true,
      dewormed: true,
      goodWithChildren: true,
      goodWithDogs: true,
      sociable: true
    },
    status: 'DISPONIBLE'
  },
  {
    shelterKey: 'huellitas',
    name: 'Milo',
    species: 'Gato',
    breed: 'Criollo',
    sex: 'Macho',
    size: 'Pequeño',
    birthDate: '2025-11-05',
    color: 'Blanco y negro',
    weightKg: 1.8,
    city: 'Lima',
    region: 'Lima',
    description: 'Cachorro juguetón que necesita mucha compañía.',
    story: 'Fue encontrado dentro de una caja en un mercado junto a sus hermanos.',
    image: photo('photo-1495360010541-f48722b34f7d'),
    attributes: { dewormed: true, sociable: true, goodWithCats: true },
    status: 'DISPONIBLE'
  },
  {
    shelterKey: 'esperanza',
    name: 'Nala',
    species: 'Perro',
    breed: 'Mestiza',
    sex: 'Hembra',
    size: 'Mediano',
    birthDate: '2024-08-30',
    color: 'Marrón claro',
    weightKg: 14.5,
    city: 'Arequipa',
    region: 'Arequipa',
    description: 'Muy sociable con otros perros y obediente durante los paseos.',
    story: 'Rescatada de la calle con desnutrición, hoy está completamente recuperada.',
    image: photo('photo-1543466835-00a7907e9de1'),
    attributes: { vaccinated: true, dewormed: true, goodWithDogs: true, goodWithChildren: true },
    status: 'DISPONIBLE'
  },
  {
    shelterKey: 'esperanza',
    name: 'Toby',
    species: 'Perro',
    breed: 'Beagle',
    sex: 'Macho',
    size: 'Mediano',
    birthDate: '2019-06-15',
    color: 'Tricolor',
    weightKg: 12,
    city: 'Arequipa',
    region: 'Arequipa',
    description: 'Adulto tranquilo, perfecto para un hogar sin prisas.',
    story: 'Su dueño falleció y la familia no pudo hacerse cargo.',
    image: photo('photo-1537151625747-768eb6cf92b2'),
    attributes: { vaccinated: true, sterilized: true, dewormed: true, sociable: true },
    status: 'DISPONIBLE'
  },
  {
    shelterKey: 'huellitas',
    name: 'Kira',
    species: 'Perro',
    breed: 'Border Collie',
    sex: 'Hembra',
    size: 'Mediano',
    birthDate: '2022-02-02',
    color: 'Blanco y negro',
    weightKg: 17,
    city: 'Lima',
    region: 'Lima',
    description: 'Muy inteligente; necesita estimulación mental diaria.',
    story: 'Entregada por una familia que no podía cubrir su nivel de actividad.',
    image: photo('photo-1518717758536-85ae29035b6d'),
    attributes: { vaccinated: true, sterilized: true, goodWithChildren: true, sociable: true },
    status: 'DISPONIBLE'
  },
  {
    shelterKey: 'esperanza',
    name: 'Coco',
    species: 'Conejo',
    breed: 'Cabeza de león',
    sex: 'Macho',
    size: 'Pequeño',
    birthDate: '2025-05-18',
    color: 'Beige',
    weightKg: 1.5,
    city: 'Arequipa',
    region: 'Arequipa',
    description: 'Conejo dócil acostumbrado a vivir dentro de casa.',
    story: 'Entregado por una familia que no podía seguir cuidándolo.',
    image: photo('photo-1585110396000-c9ffd4e4b308'),
    attributes: { dewormed: true, sociable: true, specialCare: true },
    status: 'DISPONIBLE'
  },
  {
    shelterKey: 'huellitas',
    name: 'Rocky',
    species: 'Perro',
    breed: 'Pastor Alemán',
    sex: 'Macho',
    size: 'Grande',
    birthDate: '2017-09-09',
    color: 'Negro y fuego',
    weightKg: 32,
    city: 'Lima',
    region: 'Lima',
    description: 'Senior noble que busca un hogar tranquilo para su retiro.',
    story: 'Trabajó como perro guardián y hoy merece descansar.',
    image: photo('photo-1589941013453-ec89f33b5e95'),
    attributes: { vaccinated: true, sterilized: true, dewormed: true, specialCare: true },
    status: 'NO_DISPONIBLE'
  },
  {
    shelterKey: 'esperanza',
    name: 'Pelusa',
    species: 'Gato',
    breed: 'Persa',
    sex: 'Hembra',
    size: 'Pequeño',
    birthDate: '2023-12-01',
    color: 'Blanco',
    weightKg: 4.1,
    city: 'Arequipa',
    region: 'Arequipa',
    description: 'Necesita cepillado diario y un ambiente sin ruido.',
    story: 'Rescatada de un criadero clandestino.',
    image: photo('photo-1514888286974-6c03e2ca1dba'),
    attributes: { vaccinated: true, sterilized: true, specialCare: true },
    status: 'DISPONIBLE'
  },
  {
    shelterKey: 'huellitas',
    name: 'Piolín',
    species: 'Ave',
    breed: 'Canario',
    sex: 'Macho',
    size: 'Pequeño',
    birthDate: '2025-01-10',
    color: 'Amarillo',
    weightKg: 0.03,
    city: 'Lima',
    region: 'Lima',
    description: 'Canta todas las mañanas. Se entrega con su jaula.',
    story: 'Su dueña se mudó a un departamento que no admite mascotas.',
    image: photo('photo-1552728089-57bdde30beb3'),
    attributes: { sociable: true },
    status: 'DISPONIBLE'
  },
  {
    shelterKey: 'esperanza',
    name: 'Simba',
    species: 'Gato',
    breed: 'Naranja mestizo',
    sex: 'Macho',
    size: 'Mediano',
    birthDate: '2022-07-21',
    color: 'Naranja',
    weightKg: 5.2,
    city: 'Arequipa',
    region: 'Arequipa',
    description: 'Independiente pero muy apegado a la hora de comer.',
    story: 'Vivía en la azotea de un edificio hasta que los vecinos lo rescataron.',
    image: photo('photo-1592194996308-7b43878e84a6'),
    attributes: { vaccinated: true, sterilized: true, dewormed: true },
    status: 'DISPONIBLE'
  },
  {
    shelterKey: 'huellitas',
    name: 'Nube',
    species: 'Roedor',
    breed: 'Cuy',
    sex: 'Hembra',
    size: 'Pequeño',
    birthDate: '2025-08-14',
    color: 'Blanco',
    weightKg: 0.9,
    city: 'Lima',
    region: 'Lima',
    description: 'Ideal como primera mascota para niños acompañados de un adulto.',
    story: 'Nació en el refugio tras el rescate de su madre.',
    image: photo('photo-1548767797-d8c844163c4c'),
    attributes: { dewormed: true, goodWithChildren: true, sociable: true },
    status: 'DISPONIBLE'
  },
  {
    shelterKey: 'esperanza',
    name: 'Duna',
    species: 'Perro',
    breed: 'Mestiza',
    sex: 'Hembra',
    size: 'Pequeño',
    birthDate: '2024-11-11',
    color: 'Crema',
    weightKg: 7.3,
    city: 'Arequipa',
    region: 'Arequipa',
    description: 'Pequeña, cariñosa y perfecta para departamento.',
    story: 'Abandonada en una caja frente al refugio.',
    image: photo('photo-1591160690555-5debfba289f0'),
    attributes: { vaccinated: true, dewormed: true, goodWithChildren: true, sociable: true },
    status: 'DISPONIBLE'
  },
  {
    shelterKey: 'huellitas',
    name: 'Zeus',
    species: 'Perro',
    breed: 'Husky',
    sex: 'Macho',
    size: 'Grande',
    birthDate: '2021-04-04',
    color: 'Gris y blanco',
    weightKg: 24,
    city: 'Lima',
    region: 'Lima',
    description: 'Necesita ejercicio intenso y un patio seguro.',
    story: 'Rescatado de un caso de maltrato reportado por los vecinos.',
    image: photo('photo-1605568427561-40dd23c2acea'),
    attributes: { vaccinated: true, dewormed: true, goodWithDogs: true },
    status: 'DISPONIBLE'
  }
];
