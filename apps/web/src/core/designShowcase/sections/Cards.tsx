import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@shared/components/ui";
import { Sec, Group } from "../_shared";

export function CardsSection() {
  return (
    <Sec id="cards" title="Карти">
      <Group label="Основні варіанти">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {(
            ["default", "interactive", "flat", "elevated", "ghost"] as const
          ).map((variant) => (
            <Card key={variant} variant={variant} padding="md" radius="lg">
              <div className="text-xs font-semibold text-text">{variant}</div>
              <div className="text-2xs text-muted mt-1">
                variant=&quot;{variant}&quot;
              </div>
            </Card>
          ))}
        </div>
      </Group>

      <Group label="Module hero cards">
        <div className="grid grid-cols-2 gap-4">
          {(["finyk", "fizruk", "routine", "nutrition"] as const).map(
            (variant) => (
              <Card key={variant} variant={variant} padding="lg">
                <div className="text-sm font-bold">{variant}</div>
                <div className="text-2xs text-muted mt-1">Module hero</div>
              </Card>
            ),
          )}
          {(
            [
              "finyk-soft",
              "fizruk-soft",
              "routine-soft",
              "nutrition-soft",
            ] as const
          ).map((variant) => (
            <Card key={variant} variant={variant} padding="md">
              <div className="text-xs font-semibold text-text">{variant}</div>
            </Card>
          ))}
        </div>
      </Group>

      <Group label="Padding">
        <div className="flex flex-wrap gap-3">
          {(["sm", "md", "lg", "xl"] as const).map((padding) => (
            <Card
              key={padding}
              variant="default"
              padding={padding}
              radius="lg"
              className="text-xs text-muted font-mono"
            >
              padding=&quot;{padding}&quot;
            </Card>
          ))}
        </div>
      </Group>

      <Group label="Повний layout">
        <Card variant="elevated" padding="lg" radius="xl">
          <CardHeader>
            <CardTitle>Заголовок картки</CardTitle>
            <Badge variant="accent">Новий</Badge>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Опис або довільний вміст картки — кілька рядків для демонстрації
              структури CardHeader / CardContent / CardFooter.
            </CardDescription>
          </CardContent>
          <CardFooter>
            <Button size="sm" variant="secondary">
              Скасувати
            </Button>
            <Button size="sm">Зберегти</Button>
          </CardFooter>
        </Card>
      </Group>
    </Sec>
  );
}
