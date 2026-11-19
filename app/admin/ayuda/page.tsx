import { Instructivo } from "../../../components/Instructivo";
import { GUIAS_PANEL } from "../../../lib/instructivo";
import "../../../components/instructivo.css";

// Instructivo del panel. Las guías para socios están en /ayuda (públicas).
export default function Page() {
  return (
    <>
      <Instructivo
        guias={GUIAS_PANEL}
        titulo="Instructivo del panel"
        bajada="El paso a paso de las tareas de todos los días. Las guías para los socios (alta, credencial, contraseña) están en la ayuda pública."
      />
      <p className="section-hint" style={{ marginTop: "1.5rem" }}>
        Ayuda para socios:{" "}
        <a href="/ayuda" target="_blank" rel="noopener noreferrer">
          caphsf.ar/ayuda
        </a>{" "}
        (se la podés mandar a quien tenga dudas).
      </p>
    </>
  );
}
