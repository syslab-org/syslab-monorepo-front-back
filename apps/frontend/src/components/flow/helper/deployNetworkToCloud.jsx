import axios from "axios";


const deployNetworkToCloud = async (data) => {

    // eslint-disable-next-line no-useless-catch
    try {
        const response = await axios.post('https://run.mocky.io/v3/0bb74bdf-5d0b-4286-8aaf-0c06376c7305', data)
        return response.data
    } catch (error) {
        throw error;
    }
}

export default deployNetworkToCloud