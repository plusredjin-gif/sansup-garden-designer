import type { GardenFeature, Geometry } from "../types/garden";
import { centroid, measured } from "./geo";
import { editedShape } from "./shapes";

export function moveFeature(fs: GardenFeature[], id: string, geometry: Geometry, wholeGuild: boolean, operation: "translate" | "modify"): GardenFeature[] {
  const target = fs.find((f) => f.id === id);
  if (!target) return fs;
  // 클릭만 하고 끌지 않은 경우: 되돌리기 기록을 만들지 않는다
  if (JSON.stringify(target.geometry) === JSON.stringify(geometry)) return fs;
  const [ox, oy] = centroid(target.geometry), [nx, ny] = centroid(geometry);
  const delta: [number, number] = [nx - ox, ny - oy];
  return fs.map((f): GardenFeature => {
    if (f.id === id) return {
      ...f, geometry,
      props: measured(f.kind, geometry, { ...f.props, shape: editedShape(f.props.shape, geometry, operation, delta) }),
    };
    if (wholeGuild && operation === "translate" && target.props.guildId && f.props.guildId === target.props.guildId && f.geometry.type === "Point") {
      return { ...f, geometry: { type: "Point", coordinates: [f.geometry.coordinates[0] + delta[0], f.geometry.coordinates[1] + delta[1]] } };
    }
    return f;
  });
}
