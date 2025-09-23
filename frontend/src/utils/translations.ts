export const categoryToSpanish = (categoryKey: string | null | undefined): string => {
    if (!categoryKey) return "Desconocido";
    const mapping: { [key: string]: string } = {
        "PARKING": "Parking",
        "TAXI": "Taxi",
        "AVION/TREN": "Avión/Tren",
        "HOTEL": "Hotel",
        "ALMUERZO": "Almuerzo",
        "CENA": "Cena",
        "VARIOS": "Varios",
        "MISCELLANEOUS": "Varios", // common alternative for VARIOS
    };
    return mapping[categoryKey.toUpperCase()] || categoryKey;
};