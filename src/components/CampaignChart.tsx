import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"

import { campaigns } from "../data/mockData"

function CampaignChart() {
  return (
    <section>

      <h2>Performance das campanhas</h2>

      <h3>Investimento x Receita</h3>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={campaigns}>

          <CartesianGrid strokeDasharray="3 3" />

          <XAxis dataKey="name" />

          <YAxis />

          <Tooltip />

          <Legend />

          <Line
            type="monotone"
            dataKey="investment"
            name="Investimento"
          />

          <Line
            type="monotone"
            dataKey="revenue"
            name="Receita"
          />

        </LineChart>
      </ResponsiveContainer>


      <h3>Conversões por campanha</h3>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={campaigns}>

          <CartesianGrid strokeDasharray="3 3" />

          <XAxis dataKey="name" />

          <YAxis />

          <Tooltip />

          <Legend />

          <Line
            type="monotone"
            dataKey="conversions"
            name="Conversões"
          />

        </LineChart>
      </ResponsiveContainer>

    </section>
  )
}

export default CampaignChart